import { describe, it, expect } from "vitest";
import { whatsappService } from "@/lib/whatsapp";

describe("WhatsApp Service Formatting", () => {
  it("should format a valid EOD summary message with cash shortage alert", () => {
    const summary = whatsappService.formatEODSummary({
      date: "31 Oct 2026",
      totalSales: 45000,
      cashSales: 15000,
      upiSales: 30000,
      billCount: 185,
      cashShortageTotal: 350,
      kiosks: [
        { name: "Indiranagar Metro", sales: 25000, bills: 105, cashShortage: 0 },
        { name: "Koramangala 5th Block", sales: 20000, bills: 80, cashShortage: 350 },
      ],
      topItems: [
        { name: "Masala Chai", quantity: 240, revenue: 4800 },
        { name: "Paneer Roll", quantity: 65, revenue: 5850 },
      ],
    });

    expect(summary).toContain("KIOSK ERP — DAILY P&L SUMMARY");
    expect(summary).toContain("Total Sales:* ₹45,000");
    expect(summary).toContain("Cash Shortage Alert:* -₹350");
    expect(summary).toContain("Indiranagar Metro");
    expect(summary).toContain("Masala Chai: 240 sold");
  });

  it("should format customer digital e-bill correctly", () => {
    const bill = whatsappService.formatCustomerEBill({
      billNumber: "BILL-2026-0042",
      kioskName: "Chai Corner HSR",
      date: "31 Oct, 18:30",
      items: [
        { name: "Adrak Chai", quantity: 2, price: 20, total: 40 },
        { name: "Bun Maska", quantity: 1, price: 35, total: 35 },
      ],
      subtotal: 75,
      discount: 0,
      gstAmount: 3.75,
      total: 78.75,
      paymentMode: "UPI",
      tokenNumber: "104",
    });

    expect(bill).toContain("RECEIPT — CHAI CORNER HSR");
    expect(bill).toContain("Token: #104");
    expect(bill).toContain("Adrak Chai x 2 = ₹40");
    expect(bill).toContain("Total Paid: ₹78.75* (UPI)");
  });

  it("should generate a valid wa.me URL for 10-digit Indian numbers", () => {
    const url = whatsappService.createWhatsAppLink("9876543210", "Hello Kiosk Owner");
    expect(url).toBe("https://wa.me/919876543210?text=Hello%20Kiosk%20Owner");
  });
});
