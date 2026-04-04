/**
 * Receipt Generator (F2: Receipt Printing)
 * Generates a text-based receipt for 58mm thermal printer (48 chars per line)
 * Phase 1: PDF share via browser print / share sheet
 * Phase 2: ESC/POS via Web Bluetooth
 */

const LINE_WIDTH = 48;

function center(text: string): string {
  const pad = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
  return " ".repeat(pad) + text;
}

function line(char = "-"): string {
  return char.repeat(LINE_WIDTH);
}

function row(left: string, right: string): string {
  const space = LINE_WIDTH - left.length - right.length;
  return left + " ".repeat(Math.max(1, space)) + right;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  gstRate: number;
  gstAmount: number;
}

interface ReceiptData {
  kioskName: string;
  kioskAddress?: string;
  fssaiNumber?: string;
  gstin?: string;
  billNumber: number;
  date: string;
  operatorName: string;
  items: ReceiptItem[];
  subtotal: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  total: number;
  paymentMode: string;
  upiTransactionRef?: string;
  cashAmount?: number;
  upiAmount?: number;
  orderChannel?: string;
  customerPhone?: string;
  loyaltyPoints?: number;
}

export function generateReceiptText(data: ReceiptData): string {
  const lines: string[] = [];

  // Header
  lines.push(center(data.kioskName.toUpperCase()));
  if (data.kioskAddress) lines.push(center(data.kioskAddress));
  if (data.fssaiNumber) lines.push(center(`FSSAI: ${data.fssaiNumber}`));
  if (data.gstin) lines.push(center(`GSTIN: ${data.gstin}`));
  lines.push(line("="));

  // Bill info
  lines.push(row(`Bill #${data.billNumber}`, data.date));
  lines.push(`Operator: ${data.operatorName}`);
  if (data.orderChannel && data.orderChannel !== "WALK_IN") {
    lines.push(`Channel: ${data.orderChannel}`);
  }
  lines.push(line("-"));

  // Items header
  lines.push(row("Item", "Amt"));
  lines.push(line("-"));

  // Items
  for (const item of data.items) {
    const name = item.name.substring(0, 30);
    lines.push(name);
    const detail = `  ${item.quantity} x ₹${item.unitPrice.toFixed(0)}`;
    lines.push(row(detail, `₹${item.lineTotal.toFixed(0)}`));
  }
  lines.push(line("-"));

  // Totals
  lines.push(row("Subtotal", `₹${data.subtotal.toFixed(2)}`));
  if (data.cgstAmount > 0) {
    lines.push(row("CGST", `₹${data.cgstAmount.toFixed(2)}`));
    lines.push(row("SGST", `₹${data.sgstAmount.toFixed(2)}`));
  }
  lines.push(line("="));
  lines.push(row("TOTAL", `₹${data.total.toFixed(2)}`));
  lines.push(line("="));

  // Payment
  lines.push(`Payment: ${data.paymentMode}`);
  if (data.paymentMode === "MIXED") {
    if (data.cashAmount) lines.push(`  Cash: ₹${data.cashAmount.toFixed(0)}`);
    if (data.upiAmount) lines.push(`  UPI: ₹${data.upiAmount.toFixed(0)}`);
  }
  if (data.upiTransactionRef) {
    lines.push(`UTR: ${data.upiTransactionRef}`);
  }

  // Customer
  if (data.customerPhone) {
    lines.push(line("-"));
    lines.push(`Customer: ${data.customerPhone}`);
    if (data.loyaltyPoints != null) {
      lines.push(`Points earned: ${data.loyaltyPoints}`);
    }
  }

  // Footer
  lines.push(line("-"));
  lines.push(center("Thank you! Visit again."));
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a printable HTML receipt (for PDF/print)
 */
export function generateReceiptHTML(data: ReceiptData): string {
  const text = generateReceiptText(data);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${data.billNumber}</title>
  <style>
    body { font-family: 'Courier New', monospace; font-size: 12px; width: 58mm; margin: 0 auto; padding: 4mm; }
    pre { white-space: pre-wrap; word-wrap: break-word; margin: 0; }
    @media print { body { margin: 0; padding: 2mm; } }
  </style>
</head>
<body><pre>${text}</pre></body>
</html>`;
}
