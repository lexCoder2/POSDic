import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnDestroy,
  OnChanges,
  SimpleChanges,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { ToastService } from "../../../services/toast.service";
import { Html5Qrcode } from "html5-qrcode";

@Component({
  selector: "app-camera-scanner",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./camera-scanner.component.html",
  styleUrls: ["./camera-scanner.component.scss"],
})
export class CameraScannerComponent implements OnDestroy, OnChanges {
  @Input() isActive = false;

  @Output() barcodeDetected = new EventEmitter<string>();
  @Output() close = new EventEmitter<void>();

  showScanToast = false;
  scanToastText = "";

  private cameraScanner: any = null;
  private _mediaStream: MediaStream | null = null;
  private _videoEl: HTMLVideoElement | null = null;
  private _scanTimer: any = null;
  private _lastScannedValue: string | null = null;
  private _lastScannedAt = 0;

  constructor(private toastService: ToastService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["isActive"]) {
      if (this.isActive) {
        this.startCameraScanner();
      } else {
        this.stopCameraScanner();
      }
    }
  }

  ngOnDestroy(): void {
    this.stopCameraScanner();
  }

  onOverlayClick(): void {
    this.close.emit();
  }

  onCloseClick(): void {
    this.close.emit();
  }

  private async startCameraScanner(): Promise<void> {
    try {
      // Wait a tick for Angular to render the overlay and camera container
      await new Promise((res) => setTimeout(res, 50));

      // Check if Html5Qrcode library is loaded
      if (typeof Html5Qrcode !== "undefined") {
        this.cameraScanner = new Html5Qrcode("camera-scanner");

        await this.cameraScanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => {
            this.handleCameraDetected(String(decodedText));
          },
          (error: any) => {
            // Ignore decode errors
          }
        );
        return;
      }

      // Fallback: try using native BarcodeDetector (modern browsers)
      const hasBarcodeDetector = (window as any).BarcodeDetector;
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.toastService.show(
          "Camera not available on this device/browser.",
          "error",
          2000
        );
        this.close.emit();
        return;
      }

      const container = document.getElementById("camera-scanner");
      if (!container) {
        console.error("HTML Element with id=camera-scanner not found");
        this.toastService.show("Camera container not found.", "error", 1800);
        this.close.emit();
        return;
      }

      // Create video element
      this._videoEl = document.createElement("video");
      this._videoEl.setAttribute("playsinline", "true");
      this._videoEl.style.width = "100%";
      this._videoEl.style.height = "auto";
      container.innerHTML = "";
      container.appendChild(this._videoEl);

      try {
        this._mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        this._videoEl.srcObject = this._mediaStream;
        await this._videoEl.play();

        if (hasBarcodeDetector) {
          // Use native BarcodeDetector
          try {
            const formats = [
              "ean_13",
              "ean_8",
              "upc_a",
              "upc_e",
              "code_128",
              "qr_code",
            ];
            const detector = new (window as any).BarcodeDetector({
              formats,
            });

            const scanFrame = async () => {
              if (!this._videoEl || this._videoEl.readyState < 2) return;
              try {
                const canvas = document.createElement("canvas");
                canvas.width = this._videoEl.videoWidth;
                canvas.height = this._videoEl.videoHeight;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.drawImage(this._videoEl, 0, 0, canvas.width, canvas.height);
                const barcodes = await detector.detect(canvas);
                if (barcodes && barcodes.length) {
                  for (const b of barcodes) {
                    const raw = b.rawValue || b.raw || b.value || null;
                    if (raw) {
                      this.handleCameraDetected(String(raw));
                      return;
                    }
                  }
                }
              } catch (e) {
                // ignore single-frame errors
              }
            };

            // Poll at ~8 FPS
            this._scanTimer = setInterval(scanFrame, 125);
          } catch (e) {
            console.warn(
              "BarcodeDetector failed, falling back to simple preview",
              e
            );
          }
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        this.toastService.show(
          "Unable to access camera. Make sure permissions are granted.",
          "error",
          2200
        );
        this.close.emit();
      }
    } catch (err) {
      console.error("Error starting camera scanner:", err);
      this.toastService.show("Failed to start camera scanner", "error", 1600);
    }
  }

  private stopCameraScanner(): void {
    // Stop Html5Qrcode scanner if present
    if (this.cameraScanner && typeof this.cameraScanner.stop === "function") {
      try {
        this.cameraScanner.stop().then(() => {
          this.cameraScanner = null;
        });
      } catch (e) {
        this.cameraScanner = null;
      }
    }

    // Stop native media stream if used
    try {
      if (this._scanTimer) {
        clearInterval(this._scanTimer);
        this._scanTimer = null;
      }

      if (this._videoEl) {
        try {
          this._videoEl.pause();
          this._videoEl.srcObject = null;
        } catch (e) {
          /* ignore */
        }
        const container = document.getElementById("camera-scanner");
        if (container) container.innerHTML = "";
        this._videoEl = null;
      }

      if (this._mediaStream) {
        this._mediaStream.getTracks().forEach((t) => t.stop());
        this._mediaStream = null;
      }
    } catch (e) {
      console.warn("Error stopping native camera scanner", e);
    }
  }

  private handleCameraDetected(raw: string): void {
    const now = Date.now();
    if (this._lastScannedValue === raw && now - this._lastScannedAt < 1000) {
      return; // ignore duplicates
    }

    this._lastScannedValue = raw;
    this._lastScannedAt = now;

    // Play beep and show toast
    this.playBeep();
    this.scanToastText = raw;
    this.showScanToast = true;
    setTimeout(() => (this.showScanToast = false), 900);

    // Emit the detected barcode
    this.barcodeDetected.emit(raw);

    // Vibrate on mobile
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }

  private playBeep(): void {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 1000;
      g.gain.value = 0.15;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => {
        try {
          o.stop();
          ctx.close();
        } catch (e) {
          /* ignore */
        }
      }, 120);
    } catch (e) {
      // ignore audio errors
    }
  }
}
