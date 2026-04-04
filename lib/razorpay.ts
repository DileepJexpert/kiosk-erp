/**
 * Razorpay Client Initialization (F1: UPI Payment Phase 2)
 *
 * Setup:
 * 1. npm install razorpay
 * 2. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
 *
 * Usage:
 * - Create dynamic QR codes for UPI payments
 * - Verify payments via webhooks
 * - Auto-reconcile settlements
 */

let razorpayInstance: any = null;

export function getRazorpayClient() {
  if (razorpayInstance) return razorpayInstance;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  try {
    // Dynamic import to avoid build errors when razorpay isn't installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Razorpay = require("razorpay");
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpayInstance;
  } catch {
    throw new Error("razorpay package not installed. Run: npm install razorpay");
  }
}

/**
 * Create a dynamic QR code for a bill payment
 */
export async function createPaymentQR(amount: number, billId: string, kioskName: string) {
  const client = getRazorpayClient();

  const qrCode = await client.qrCode.create({
    type: "upi_qr",
    name: kioskName,
    usage: "single_use",
    fixed_amount: true,
    payment_amount: amount * 100, // Razorpay uses paise
    description: `Bill payment - ${billId}`,
    notes: { billId },
    close_by: Math.floor(Date.now() / 1000) + 1800, // 30 min expiry
  });

  return {
    qrId: qrCode.id,
    imageUrl: qrCode.image_url,
    amount: amount,
  };
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");
    return expectedSignature === signature;
  } catch {
    return false;
  }
}
