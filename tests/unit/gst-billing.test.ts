import { describe, it, expect } from "vitest";
import { calculateBillTotals } from "@/server/services/billing.service";

describe("calculateBillTotals", () => {
  it("should calculate correct totals with 5% GST", () => {
    const items = [
      { quantity: 2, unitPrice: 50, gstRate: 5 }, // 100 + 5% = 105
    ];
    const result = calculateBillTotals(items);

    expect(result.subtotal).toBe(100);
    expect(result.totalGst).toBe(5);
    expect(result.cgstAmount).toBe(2.5);
    expect(result.sgstAmount).toBe(2.5);
    expect(result.total).toBe(105);
    expect(result.billItems[0].lineTotal).toBe(105);
  });

  it("should calculate multiple items with different GST rates", () => {
    const items = [
      { quantity: 2, unitPrice: 100, gstRate: 5 }, // 200 + 10 = 210
      { quantity: 1, unitPrice: 100, gstRate: 18 }, // 100 + 18 = 118
    ];
    const result = calculateBillTotals(items);

    expect(result.subtotal).toBe(300);
    expect(result.totalGst).toBe(28);
    expect(result.cgstAmount).toBe(14);
    expect(result.sgstAmount).toBe(14);
    expect(result.total).toBe(328);
  });

  it("should calculate aggregator commission and net revenue accurately", () => {
    const items = [
      { quantity: 10, unitPrice: 100, gstRate: 5 }, // 1000 + 50 = 1050 total
    ];
    const commissionRate = 20; // 20% Swiggy/Zomato commission
    const result = calculateBillTotals(items, commissionRate);

    expect(result.total).toBe(1050);
    expect(result.channelCommission).toBe(210); // 1050 * 0.20 = 210
    expect(result.netRevenue).toBe(840); // 1050 - 210 = 840
  });

  it("should default gstRate to 5% if not provided", () => {
    const items = [
      { quantity: 4, unitPrice: 25 }, // 100 + 5% default = 105
    ];
    const result = calculateBillTotals(items);

    expect(result.totalGst).toBe(5);
    expect(result.total).toBe(105);
  });
});
