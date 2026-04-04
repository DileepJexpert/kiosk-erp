/**
 * Bluetooth Thermal Printer (F2: Phase 2)
 * Uses Web Bluetooth API for ESC/POS compatible printers (58mm)
 *
 * Compatible printers: Atpos H58BT, Everycom EC-58, etc.
 * Works on: Chrome/Edge on Android/Desktop with Bluetooth
 *
 * Usage:
 *   const printer = new BluetoothPrinter();
 *   await printer.connect();
 *   await printer.printReceipt(receiptText);
 *   printer.disconnect();
 */

const ESC = 0x1b;
const GS = 0x1d;

// ESC/POS Commands
const COMMANDS = {
  INIT: new Uint8Array([ESC, 0x40]),              // Initialize printer
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 1]),   // Center alignment
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0]),     // Left alignment
  BOLD_ON: new Uint8Array([ESC, 0x45, 1]),        // Bold on
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0]),       // Bold off
  FONT_SMALL: new Uint8Array([ESC, 0x21, 0x01]),  // Small font
  FONT_NORMAL: new Uint8Array([ESC, 0x21, 0x00]), // Normal font
  CUT: new Uint8Array([GS, 0x56, 0x00]),          // Full cut
  FEED_3: new Uint8Array([ESC, 0x64, 3]),         // Feed 3 lines
  LF: new Uint8Array([0x0a]),                      // Line feed
};

export class BluetoothPrinter {
  private device: any = null;
  private characteristic: any = null;
  private connected = false;

  /**
   * Check if Web Bluetooth is available
   */
  static isAvailable(): boolean {
    return typeof navigator !== "undefined" && "bluetooth" in navigator;
  }

  /**
   * Connect to a Bluetooth thermal printer
   */
  async connect(): Promise<boolean> {
    if (!BluetoothPrinter.isAvailable()) {
      throw new Error("Web Bluetooth is not available in this browser");
    }

    try {
      // Request Bluetooth device with serial port service
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["000018f0-0000-1000-8000-00805f9b34fb"] }],
        optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
      });

      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb");
      this.characteristic = await service.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb");

      this.connected = true;
      return true;
    } catch (err) {
      console.error("Bluetooth connection failed:", err);
      this.connected = false;
      return false;
    }
  }

  /**
   * Disconnect from the printer
   */
  disconnect(): void {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.connected = false;
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Send raw bytes to printer
   */
  private async write(data: Uint8Array): Promise<void> {
    if (!this.characteristic) throw new Error("Printer not connected");

    // Send in chunks of 20 bytes (BLE MTU limit)
    const chunkSize = 20;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await this.characteristic.writeValue(chunk);
      await new Promise((r) => setTimeout(r, 50)); // Small delay between chunks
    }
  }

  /**
   * Print a text receipt
   */
  async printReceipt(text: string): Promise<void> {
    if (!this.connected) throw new Error("Printer not connected");

    await this.write(COMMANDS.INIT);
    await this.write(COMMANDS.ALIGN_LEFT);

    const encoder = new TextEncoder();
    const lines = text.split("\n");

    for (const line of lines) {
      await this.write(encoder.encode(line));
      await this.write(COMMANDS.LF);
    }

    await this.write(COMMANDS.FEED_3);
    await this.write(COMMANDS.CUT);
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connected;
  }
}
