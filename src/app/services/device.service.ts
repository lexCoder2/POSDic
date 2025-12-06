import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class DeviceService {
  private deviceId: string | null = null;
  private deviceName: string | null = null;

  constructor() {
    this.initializeDevice();
  }

  private initializeDevice(): void {
    // Try to get existing device ID from localStorage
    this.deviceId = localStorage.getItem("deviceId");
    this.deviceName = localStorage.getItem("deviceName");

    if (!this.deviceId) {
      // Generate a new device ID based on browser fingerprint
      this.deviceId = this.generateDeviceFingerprint();
      localStorage.setItem("deviceId", this.deviceId);
    }

    if (!this.deviceName) {
      // Generate a default device name
      this.deviceName = this.generateDefaultDeviceName();
      localStorage.setItem("deviceName", this.deviceName);
    }
  }

  private generateDeviceFingerprint(): string {
    // Create a fingerprint based on various browser/device characteristics
    const components: string[] = [];

    // Screen properties
    components.push(`${screen.width}x${screen.height}`);
    components.push(`${screen.colorDepth}`);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language);

    // Platform
    components.push(navigator.platform);

    // User agent hash (simplified)
    components.push(this.simpleHash(navigator.userAgent));

    // Hardware concurrency (number of CPU cores)
    if (navigator.hardwareConcurrency) {
      components.push(navigator.hardwareConcurrency.toString());
    }

    // Device memory (if available)
    if ((navigator as any).deviceMemory) {
      components.push((navigator as any).deviceMemory.toString());
    }

    // Touch support
    components.push(("ontouchstart" in window).toString());

    // Canvas fingerprint (simplified)
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("POSDic", 2, 2);
        components.push(this.simpleHash(canvas.toDataURL()));
      }
    } catch (e) {
      // Canvas fingerprinting might be blocked
    }

    // Combine all components and hash
    const fingerprint = components.join("|");
    return "DEV-" + this.simpleHash(fingerprint);
  }

  private generateDefaultDeviceName(): string {
    // Try to detect device type
    const ua = navigator.userAgent.toLowerCase();
    let deviceType = "Desktop";

    if (/mobile|android|iphone|ipad|tablet/i.test(ua)) {
      if (/ipad|tablet/i.test(ua)) {
        deviceType = "Tablet";
      } else {
        deviceType = "Mobile";
      }
    }

    // Get browser name
    let browser = "Unknown";
    if (ua.includes("chrome") && !ua.includes("edge")) {
      browser = "Chrome";
    } else if (ua.includes("firefox")) {
      browser = "Firefox";
    } else if (ua.includes("safari") && !ua.includes("chrome")) {
      browser = "Safari";
    } else if (ua.includes("edge")) {
      browser = "Edge";
    }

    // Create a friendly device name
    const shortId = this.deviceId?.slice(-6) || "000000";
    return `${deviceType}-${browser}-${shortId}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and make sure it's positive
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  }

  getDeviceId(): string {
    return this.deviceId || this.generateDeviceFingerprint();
  }

  getDeviceName(): string {
    return this.deviceName || this.generateDefaultDeviceName();
  }

  setDeviceName(name: string): void {
    this.deviceName = name;
    localStorage.setItem("deviceName", name);
  }

  // Get a short display version of the device ID
  getShortDeviceId(): string {
    const id = this.getDeviceId();
    return id.slice(-8);
  }
}
