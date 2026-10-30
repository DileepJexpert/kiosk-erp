/**
 * UPI QR Code Generator (F1: UPI Payment Phase 1 — Static QR)
 *
 * Generates a UPI payment URL that can be encoded as a QR code.
 * Uses the `qrcode` npm package for rendering.
 */
import QRCode from "qrcode";

/**
 * Generate a UPI payment URL
 * Format: upi://pay?pa=<upiId>&pn=<name>&am=<amount>&tn=<note>
 */
export function generateUPIUrl(
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote?: string
): string {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
  });
  if (transactionNote) {
    params.set("tn", transactionNote);
  }
  return `upi://pay?${params.toString()}`;
}

/**
 * Generate QR code as a data URL (for display in <img> tag)
 */
export async function generateQRDataUrl(text: string): Promise<string> {
  return await QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Generate a UPI QR code data URL for a given bill
 */
export async function generateUPIQR(
  upiId: string,
  kioskName: string,
  amount: number,
  billNumber: number
): Promise<string> {
  const url = generateUPIUrl(upiId, kioskName, amount, `Bill #${billNumber}`);
  return generateQRDataUrl(url);
}
