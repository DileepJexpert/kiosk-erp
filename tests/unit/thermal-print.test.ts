import { describe, it, expect } from "vitest";
import {
  generateKOTPrintText,
  generateReceiptPrintText,
  generateZReportPrintText,
} from "@/lib/printer-thermal";

describe("Thermal 58mm/80mm ESC/POS Formatter", () => {
  it("should generate a clean KOT slip with modifiers and token number", () => {
    const kotData = {
      kioskName: "Cyber Hub Chai Bar",
      tokenNumber: "0042",
      billNumber: 1042,
      time: "02:45 PM",
      orderType: "TAKEAWAY",
      operatorName: "Rahul",
      notes: "Make it extra hot",
      items: [
        {
          name: "Ginger Elaichi Chai",
          quantity: 2,
          unitPrice: 20,
          lineTotal: 40,
          modifiers: [{ name: "Less Sugar", price: 0 }, { name: "Extra Ginger", price: 5 }],
        },
        {
          name: "Paneer Tikka Roll",
          quantity: 1,
          unitPrice: 80,
          lineTotal: 80,
          modifiers: [{ name: "No Onion", price: 0 }],
        },
      ],
    };

    const text = generateKOTPrintText(kotData, 42);

    expect(text).toContain("KITCHEN ORDER TICKET (KOT)");
    expect(text).toContain("TOKEN: #0042");
    expect(text).toContain("TAKEAWAY");
    expect(text).toContain("2    Ginger Elaichi Chai");
    expect(text).toContain(">> [LESS SUGAR]");
    expect(text).toContain(">> [EXTRA GINGER]");
    expect(text).toContain("Total Items: 3");
  });

  it("should generate a tax receipt slip with GST, tender calculation, and totals", () => {
    const receiptData = {
      kioskName: "Chai Kiosk ERP",
      location: "DLF Cyber City, Gurugram",
      gstin: "07AAAAA0000A1Z5",
      fssai: "10821000000000",
      billNumber: 1042,
      tokenNumber: "0042",
      date: "04/11/2026",
      time: "02:45 PM",
      orderType: "DINE_IN",
      paymentMode: "CASH",
      operatorName: "Rahul",
      items: [
        {
          name: "Masala Chai",
          quantity: 2,
          unitPrice: 20,
          lineTotal: 40,
        },
      ],
      subtotal: 38.1,
      cgst: 0.95,
      sgst: 0.95,
      total: 40,
      tenderAmount: 100,
      changeReturned: 60,
    };

    const text = generateReceiptPrintText(receiptData, 42);

    expect(text).toContain("CHAI KIOSK ERP");
    expect(text).toContain("GSTIN: 07AAAAA0000A1Z5");
    expect(text).toContain("GRAND TOTAL:");
    expect(text).toContain("₹40.00");
    expect(text).toContain("Cash Tendered:");
    expect(text).toContain("₹100.00");
    expect(text).toContain("Change Return:");
    expect(text).toContain("₹60.00");
  });

  it("should generate a Shift Closing Z-Report summary with drawer audit status", () => {
    const reportData = {
      reportNumber: "ZR-KIOSK-001",
      generatedAt: new Date("2026-11-04T22:00:00"),
      kiosk: {
        name: "Metro Station Chai",
        operatorName: "Amit Kumar",
      },
      financials: {
        grossSales: 5400,
        totalDiscounts: 200,
        netRevenue: 5200,
        totalGst: 247.6,
        aov: 65,
      },
      payments: {
        cash: { count: 50, amount: 3200 },
        upi: { count: 30, amount: 2000 },
      },
      drawerReconciliation: {
        cashRevenue: 3200,
        totalPettyCashExpenses: 200,
        expectedCashInDrawer: 3000,
        actualCashCollected: 3000,
        shortage: 0,
      },
      metrics: {
        totalBills: 80,
      },
    };

    const text = generateZReportPrintText(reportData, 42);

    expect(text).toContain("DAILY SHIFT CLOSING (Z-REPORT)");
    expect(text).toContain("NET REVENUE:");
    expect(text).toContain("₹5200.00");
    expect(text).toContain("DRAWER AUDIT STATUS:");
    expect(text).toContain("BALANCED");
    expect(text).toContain("Cashier Signature:");
  });
});
