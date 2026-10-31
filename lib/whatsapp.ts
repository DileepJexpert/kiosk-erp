export interface EODSummaryData {
  date: string;
  totalSales: number;
  cashSales: number;
  upiSales: number;
  billCount: number;
  cashShortageTotal: number;
  kiosks: {
    name: string;
    sales: number;
    bills: number;
    cashShortage: number;
  }[];
  topItems: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

export interface CustomerEBillData {
  billNumber: string;
  kioskName: string;
  kioskLocation?: string;
  date: string;
  customerPhone?: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  gstAmount: number;
  total: number;
  paymentMode: string;
  tokenNumber?: string;
  gstin?: string;
}

export const whatsappService = {
  /**
   * Formats a crisp, executive End-of-Day (EOD) P&L summary for the business owner.
   */
  formatEODSummary(data: EODSummaryData): string {
    const header = `📊 *KIOSK ERP — DAILY P&L SUMMARY*\n📅 Date: ${data.date}\n─────────────────────`;
    const totals = `💰 *Total Sales:* ₹${data.totalSales.toLocaleString("en-IN")}\n• UPI: ₹${data.upiSales.toLocaleString("en-IN")}\n• Cash: ₹${data.cashSales.toLocaleString("en-IN")}\n🧾 Total Bills: ${data.billCount}`;
    
    const shortageAlert = data.cashShortageTotal > 0
      ? `\n⚠️ *Cash Shortage Alert:* -₹${data.cashShortageTotal.toLocaleString("en-IN")}`
      : `\n✅ *Cash Reconciliation:* 100% Balanced`;

    const kioskBreakdown = `\n\n🏪 *Kiosk Breakdown:*\n` + data.kiosks
      .map((k, i) => `${i + 1}. *${k.name}*: ₹${k.sales.toLocaleString("en-IN")} (${k.bills} bills)${k.cashShortage > 0 ? ` ⚠️ -₹${k.cashShortage}` : ""}`)
      .join("\n");

    const topItemsList = data.topItems.length > 0
      ? `\n\n🔥 *Top Selling Items:*\n` + data.topItems
          .map((item, i) => `${i + 1}. ${item.name}: ${item.quantity} sold (₹${item.revenue.toLocaleString("en-IN")})`)
          .join("\n")
      : "";

    const footer = `\n─────────────────────\n_Generated automatically by Kiosk ERP_`;

    return `${header}\n\n${totals}${shortageAlert}${kioskBreakdown}${topItemsList}${footer}`;
  },

  /**
   * Formats an itemized digital e-bill for customers.
   */
  formatCustomerEBill(data: CustomerEBillData): string {
    const tokenStr = data.tokenNumber ? `\n🎟️ *Token: #${data.tokenNumber}*` : "";
    const gstinStr = data.gstin ? `\nGSTIN: ${data.gstin}` : "";
    const header = `🧾 *RECEIPT — ${data.kioskName.toUpperCase()}*${gstinStr}${tokenStr}\nBill #${data.billNumber} | ${data.date}\n─────────────────────`;

    const itemsStr = data.items
      .map((it) => `${it.name} x ${it.quantity} = ₹${it.total.toLocaleString("en-IN")}`)
      .join("\n");

    const totals = `─────────────────────\n` +
      (data.discount > 0 ? `Subtotal: ₹${data.subtotal.toLocaleString("en-IN")}\nDiscount: -₹${data.discount.toLocaleString("en-IN")}\n` : "") +
      (data.gstAmount > 0 ? `GST: ₹${data.gstAmount.toLocaleString("en-IN")}\n` : "") +
      `*Total Paid: ₹${data.total.toLocaleString("en-IN")}* (${data.paymentMode})`;

    const footer = `\n─────────────────────\n🙏 *Thank you for your visit! Have a delicious day.*`;

    return `${header}\n${itemsStr}\n${totals}${footer}`;
  },

  /**
   * Generates a direct WhatsApp click-to-chat URL.
   */
  createWhatsAppLink(phone: string, text: string): string {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const encodedText = encodeURIComponent(text);
    return `https://wa.me/${formattedPhone}?text=${encodedText}`;
  },

  /**
   * Formats an automated reminder message to kiosk operators for closing stock punch.
   */
  formatOperatorPunchReminder(kioskName: string, operatorName: string): string {
    return `👋 Namaste ${operatorName},\n\nThis is a friendly reminder to complete your closing inventory and cash reconciliation for *${kioskName}* on Kiosk ERP before heading home.\n\n👉 Open: https://kiosk-erp.vercel.app/my-reconcile`;
  },
};
