export interface ThermalItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  modifiers?: { name: string; price: number }[];
  notes?: string;
}

export interface ThermalReceiptData {
  kioskName: string;
  location?: string;
  address?: string;
  gstin?: string;
  fssai?: string;
  billNumber: number | string;
  tokenNumber: string;
  date: string;
  time: string;
  orderType: string; // DINE_IN, TAKEAWAY, DELIVERY
  paymentMode: string;
  operatorName?: string;
  customerName?: string;
  customerPhone?: string;
  items: ThermalItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  discountAmount?: number;
  total: number;
  tenderAmount?: number;
  changeReturned?: number;
  loyaltyMessage?: string;
}

export interface ThermalKOTData {
  kioskName: string;
  tokenNumber: string;
  billNumber: number | string;
  time: string;
  orderType: string;
  operatorName?: string;
  notes?: string;
  items: ThermalItem[];
}

export function generateKOTPrintText(data: ThermalKOTData, width = 42): string {
  const line = "=".repeat(width);
  const dashed = "-".repeat(width);

  let out = "";
  out += line + "\n";
  out += centerText("KITCHEN ORDER TICKET (KOT)", width) + "\n";
  out += centerText(data.kioskName, width) + "\n";
  out += line + "\n";
  out += `TOKEN: #${data.tokenNumber}    TYPE: ${data.orderType}\n`;
  out += `TIME: ${data.time}    SERVER: ${data.operatorName || "Counter"}\n`;
  if (data.notes) {
    out += `NOTE: ${data.notes}\n`;
  }
  out += dashed + "\n";
  out += padRow("QTY  ITEM", "", width) + "\n";
  out += dashed + "\n";

  for (const it of data.items) {
    out += `${String(it.quantity).padEnd(4)} ${it.name}\n`;
    if (it.modifiers && it.modifiers.length > 0) {
      for (const m of it.modifiers) {
        out += `     >> [${m.name.toUpperCase()}]\n`;
      }
    }
    if (it.notes) {
      out += `     * Note: ${it.notes}\n`;
    }
  }

  out += dashed + "\n";
  const totalQty = data.items.reduce((s, i) => s + i.quantity, 0);
  out += `Total Items: ${totalQty}\n`;
  out += line + "\n\n\n";
  return out;
}

export function generateReceiptPrintText(data: ThermalReceiptData, width = 42): string {
  const line = "=".repeat(width);
  const dashed = "-".repeat(width);

  let out = "";
  out += line + "\n";
  out += centerText(data.kioskName.toUpperCase(), width) + "\n";
  if (data.location) out += centerText(data.location, width) + "\n";
  if (data.gstin && data.gstin !== "NOT REGISTERED") out += centerText(`GSTIN: ${data.gstin}`, width) + "\n";
  if (data.fssai) out += centerText(`FSSAI: ${data.fssai}`, width) + "\n";
  out += line + "\n";
  out += `Bill #: ${data.billNumber}       Token: #${data.tokenNumber}\n`;
  out += `Date: ${data.date}    Time: ${data.time}\n`;
  out += `Type: ${data.orderType}        Cashier: ${data.operatorName || "Self"}\n`;
  if (data.customerPhone) out += `Customer: ${data.customerPhone}\n`;
  out += dashed + "\n";
  out += padRow("ITEM", "QTY   AMT", width) + "\n";
  out += dashed + "\n";

  for (const it of data.items) {
    out += padRow(it.name, `${it.quantity} x ₹${it.unitPrice} = ₹${it.lineTotal.toFixed(2)}`, width) + "\n";
    if (it.modifiers && it.modifiers.length > 0) {
      for (const m of it.modifiers) {
        const costStr = m.price > 0 ? `+₹${m.price}` : "";
        out += `  + ${m.name} ${costStr}\n`;
      }
    }
  }

  out += dashed + "\n";
  out += padRow("Subtotal:", `₹${data.subtotal.toFixed(2)}`, width) + "\n";
  if (data.cgst > 0) out += padRow("CGST:", `₹${data.cgst.toFixed(2)}`, width) + "\n";
  if (data.sgst > 0) out += padRow("SGST:", `₹${data.sgst.toFixed(2)}`, width) + "\n";
  if (data.discountAmount && data.discountAmount > 0) {
    out += padRow("Discount:", `-₹${data.discountAmount.toFixed(2)}`, width) + "\n";
  }
  out += line + "\n";
  out += padRow("GRAND TOTAL:", `₹${data.total.toFixed(2)}`, width) + "\n";
  out += padRow("Payment Mode:", data.paymentMode, width) + "\n";

  if (data.tenderAmount !== undefined && data.tenderAmount > 0) {
    out += padRow("Cash Tendered:", `₹${data.tenderAmount.toFixed(2)}`, width) + "\n";
    out += padRow("Change Return:", `₹${(data.changeReturned || 0).toFixed(2)}`, width) + "\n";
  }

  out += line + "\n";
  if (data.loyaltyMessage) {
    out += centerText(data.loyaltyMessage, width) + "\n";
    out += dashed + "\n";
  }
  out += centerText("Thank you! Visit again!", width) + "\n";
  out += centerText("Powered by Kiosk ERP", width) + "\n\n\n";
  return out;
}

export function generateZReportPrintText(report: any, width = 42): string {
  const line = "=".repeat(width);
  const dashed = "-".repeat(width);

  let out = "";
  out += line + "\n";
  out += centerText("DAILY SHIFT CLOSING (Z-REPORT)", width) + "\n";
  out += centerText(report.kiosk.name.toUpperCase(), width) + "\n";
  out += centerText(report.reportNumber, width) + "\n";
  out += line + "\n";
  out += `Generated: ${new Date(report.generatedAt).toLocaleString("en-IN")}\n`;
  out += `Operator: ${report.kiosk.operatorName}\n`;
  out += dashed + "\n";
  out += centerText("SALES & REVENUE SUMMARY", width) + "\n";
  out += dashed + "\n";
  out += padRow("Gross Sales:", `₹${report.financials.grossSales.toFixed(2)}`, width) + "\n";
  out += padRow("Total Discounts:", `-₹${report.financials.totalDiscounts.toFixed(2)}`, width) + "\n";
  out += padRow("NET REVENUE:", `₹${report.financials.netRevenue.toFixed(2)}`, width) + "\n";
  out += padRow("Total GST:", `₹${report.financials.totalGst.toFixed(2)}`, width) + "\n";
  out += padRow("Total Orders:", String(report.metrics.totalBills), width) + "\n";
  out += padRow("Average Order Value:", `₹${report.financials.aov.toFixed(2)}`, width) + "\n";

  out += dashed + "\n";
  out += centerText("PAYMENT METHOD BREAKDOWN", width) + "\n";
  out += dashed + "\n";
  out += padRow(`Cash (${report.payments.cash.count}):`, `₹${report.payments.cash.amount.toFixed(2)}`, width) + "\n";
  out += padRow(`UPI (${report.payments.upi.count}):`, `₹${report.payments.upi.amount.toFixed(2)}`, width) + "\n";

  out += dashed + "\n";
  out += centerText("CASH DRAWER RECONCILIATION", width) + "\n";
  out += dashed + "\n";
  out += padRow("Cash Sales:", `₹${report.drawerReconciliation.cashRevenue.toFixed(2)}`, width) + "\n";
  out += padRow("Petty Expenses:", `-₹${report.drawerReconciliation.totalPettyCashExpenses.toFixed(2)}`, width) + "\n";
  out += padRow("Expected in Drawer:", `₹${report.drawerReconciliation.expectedCashInDrawer.toFixed(2)}`, width) + "\n";
  out += padRow("Actual Drop Count:", `₹${report.drawerReconciliation.actualCashCollected.toFixed(2)}`, width) + "\n";

  const shortage = report.drawerReconciliation.shortage;
  const statusStr = shortage === 0 ? "BALANCED" : shortage > 0 ? `SHORTAGE -₹${shortage}` : `SURPLUS +₹${Math.abs(shortage)}`;
  out += line + "\n";
  out += padRow("DRAWER AUDIT STATUS:", statusStr, width) + "\n";
  out += line + "\n\n";

  out += "Cashier Signature: ____________________\n\n";
  out += "Auditor Signature: ____________________\n\n\n";
  return out;
}

export function printThermalRaw(rawText: string, title = "Print Slip") {
  const printWindow = window.open("", "_blank", "width=380,height=600");
  if (!printWindow) {
    alert("Please allow popups to enable instant thermal receipt printing.");
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          @media print {
            body {
              margin: 0;
              padding: 4mm;
            }
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.25;
            color: #000;
            background: #fff;
            width: 76mm;
            margin: 0 auto;
            padding: 8px;
            white-space: pre-wrap;
            word-break: break-word;
          }
        </style>
      </head>
      <body>${rawText}</body>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </script>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function centerText(text: string, width: number): string {
  if (text.length >= width) return text.slice(0, width);
  const leftPad = Math.floor((width - text.length) / 2);
  return " ".repeat(leftPad) + text;
}

function padRow(left: string, right: string, width: number): string {
  const spaceNeeded = width - left.length - right.length;
  if (spaceNeeded <= 0) return `${left} ${right}`;
  return left + " ".repeat(spaceNeeded) + right;
}
