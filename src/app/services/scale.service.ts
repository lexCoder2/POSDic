import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
}

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

interface SerialPortRequestOptions {
  filters?: { usbVendorId?: number; usbProductId?: number }[];
}

interface NavigatorSerial {
  requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

declare global {
  interface Navigator {
    serial?: NavigatorSerial;
  }
}

@Injectable({
  providedIn: "root",
})
export class ScaleService {
  private currentWeight = new BehaviorSubject<ScaleReading | null>(null);
  public currentWeight$ = this.currentWeight.asObservable();

  private savedWeight = new BehaviorSubject<ScaleReading | null>(null);
  public savedWeight$ = this.savedWeight.asObservable();

  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private isReading = false;

  async connectScale(): Promise<boolean> {
    try {
      // Check if Web Serial API is available
      if (!("serial" in navigator)) {
        console.error("Web Serial API not supported");
        return false;
      }

      // Request port from user
      this.port = await (navigator as any).serial.requestPort();
      if (!this.port) {
        console.error("No serial port selected");
        return false;
      }
      await this.port.open({ baudRate: 9600 });

      this.isReading = true;
      console.log("reading from scale starting");

      this.startReading();

      return true;
    } catch (error) {
      console.error("Error connecting to scale:", error);
      return false;
    }
  }

  private async startReading(): Promise<void> {
    if (!this.port) {
      console.log("error reading port");
      return;
    }
    try {
      // Set up writer to send commands
      this.writer = this.port.writable.getWriter();

      // Set up reader to receive responses
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(
        textDecoder.writable as WritableStream<Uint8Array>
      );
      this.reader = textDecoder.readable.getReader();

      // Start reading loop
      this.readLoop();

      // Send "P" command periodically to request weight
      while (this.isReading) {
        await this.sendCommand("P");
        await this.delay(500); // Request weight every 500ms
      }
    } catch (error) {
      console.error("Error reading from scale:", error);
    }
  }

  private async readLoop(): Promise<void> {
    try {
      if (!this.reader) {
        throw new Error("Failed to get reader from scale");
      }
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          this.parseWeightData(value);
        }
      }
    } catch (error) {
      console.error("Error in read loop:", error);
    }
  }

  private async sendCommand(command: string): Promise<void> {
    if (!this.writer) return;

    try {
      const encoder = new TextEncoder();
      await this.writer.write(encoder.encode(command));
    } catch (error) {
      console.error("Error sending command to scale:", error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseWeightData(data: string): void {
    // Protocol format:
    // Text section: NET, NEG, RANGE, OVERLOAD, ORANGE
    // Weight section: ###.### (with spaces between digits)
    // Units section: kg, lb, oz

    try {
      // Remove carriage returns and clean the data
      const cleanData = data.replace(/\r/g, "").trim();

      console.log("Raw scale data:", cleanData);
      // Extract status indicators (text section)
      const stable =
        !cleanData.includes("RANGE") && !cleanData.includes("OVERLOAD");
      const isNet = cleanData.includes("NET");
      const isNegative = cleanData.includes("NEG");
      const isOverload = cleanData.includes("OVERLOAD");
      const isOutOfRange = cleanData.includes("ORANGE");

      // Extract weight value (looking for pattern with digits, spaces, and decimal point)
      // Format is like: - # # # . # # # or just # # # . # # #
      const weightMatch = cleanData.match(
        /(-)?\s*(\d)\s*(\d)\s*(\d)\s*\.\s*(\d)\s*(\d)\s*(\d)/
      );

      // Alternative simpler pattern if spaces are not always present
      const simpleWeightMatch = cleanData.match(/([+-]?)\s*(\d+\.\d+)/);

      // Extract unit (kg, lb, oz)
      const unitMatch = cleanData.match(/(kg|lb|oz)/i);

      let weight = 0;

      if (weightMatch) {
        // Parse weight with spaces between digits
        const sign = weightMatch[1] === "-" ? -1 : 1;
        const digits =
          weightMatch[2] +
          weightMatch[3] +
          weightMatch[4] +
          "." +
          weightMatch[5] +
          weightMatch[6] +
          weightMatch[7];
        weight = parseFloat(digits) * sign;
      } else if (simpleWeightMatch) {
        // Parse simpler format
        weight =
          parseFloat(simpleWeightMatch[2]) *
          (simpleWeightMatch[1] === "-" ? -1 : 1);
      } else {
        return; // No valid weight found
      }

      const unit = unitMatch ? unitMatch[1].toLowerCase() : "kg";

      // Don't update if overload or out of range
      if (isOverload || isOutOfRange) {
        console.warn("Scale reading error:", { isOverload, isOutOfRange });
        return;
      }

      const reading: ScaleReading = {
        weight,
        unit,
        stable,
      };

      this.currentWeight.next(reading);

      // Save weight state if weight > 0 and stable
      if (weight > 0 && stable) {
        this.savedWeight.next(reading);
      }

      // Clear saved weight if weight is 0
      if (weight === 0) {
        this.savedWeight.next(null);
      }
    } catch (error) {
      console.error("Error parsing weight data:", error, "Data:", data);
    }
  }

  async disconnectScale(): Promise<void> {
    this.isReading = false;

    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }

    if (this.writer) {
      this.writer.releaseLock();
      this.writer = null;
    }

    if (this.port) {
      await this.port.close();
      this.port = null;
    }

    this.currentWeight.next(null);
    this.savedWeight.next(null);
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  getCurrentWeight(): ScaleReading | null {
    return this.currentWeight.value;
  }

  getSavedWeight(): ScaleReading | null {
    return this.savedWeight.value;
  }

  clearSavedWeight(): void {
    this.savedWeight.next(null);
  }

  // Mock method for testing without physical scale
  mockWeightReading(weight: number, unit = "kg"): void {
    const reading: ScaleReading = {
      weight,
      unit,
      stable: true,
    };
    this.currentWeight.next(reading);
    if (weight > 0) {
      this.savedWeight.next(reading);
    } else {
      this.savedWeight.next(null);
    }
  }
}
