import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable } from "rxjs";

export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
}

@Injectable({
  providedIn: "root",
})
export class ScaleService {
  private currentWeight = new BehaviorSubject<ScaleReading | null>(null);
  public currentWeight$ = this.currentWeight.asObservable();

  private port: any = null;
  private reader: any = null;
  private isReading = false;

  constructor() {}

  async connectScale(): Promise<boolean> {
    try {
      // Check if Web Serial API is available
      if (!("serial" in navigator)) {
        console.error("Web Serial API not supported");
        return false;
      }

      // Request port from user
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 9600 });

      this.isReading = true;
      this.startReading();

      return true;
    } catch (error) {
      console.error("Error connecting to scale:", error);
      return false;
    }
  }

  private async startReading(): Promise<void> {
    if (!this.port) return;

    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(
        textDecoder.writable
      );
      this.reader = textDecoder.readable.getReader();

      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;

        if (value) {
          this.parseWeightData(value);
        }
      }
    } catch (error) {
      console.error("Error reading from scale:", error);
    }
  }

  private parseWeightData(data: string): void {
    // Parse weight data (format depends on scale model)
    // Example: "ST,GS,+00000.000 kg"
    const weightMatch = data.match(/([+-]?\d+\.\d+)\s*(kg|g|lb)/i);

    if (weightMatch) {
      const weight = parseFloat(weightMatch[1]);
      const unit = weightMatch[2].toLowerCase();
      const stable = data.includes("ST");

      this.currentWeight.next({
        weight,
        unit,
        stable,
      });
    }
  }

  async disconnectScale(): Promise<void> {
    this.isReading = false;

    if (this.reader) {
      await this.reader.cancel();
      this.reader = null;
    }

    if (this.port) {
      await this.port.close();
      this.port = null;
    }

    this.currentWeight.next(null);
  }

  isConnected(): boolean {
    return this.port !== null;
  }

  getCurrentWeight(): ScaleReading | null {
    return this.currentWeight.value;
  }

  // Mock method for testing without physical scale
  mockWeightReading(weight: number, unit: string = "kg"): void {
    this.currentWeight.next({
      weight,
      unit,
      stable: true,
    });
  }
}
