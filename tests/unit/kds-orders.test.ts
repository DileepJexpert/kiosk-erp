import { describe, it, expect } from "vitest";
import { calculateBillTotals } from "@/server/services/billing.service";

describe("KDS & Modifiers Calculation Engine", () => {
  it("should calculate line total including modifiers", () => {
    const items = [
      {
        quantity: 2,
        unitPrice: 20, // Base chai ₹20
        modifiers: [
          { name: "Extra Ginger", price: 5 },
          { name: "Kulhad Cup", price: 5 },
        ], // Effective unit price = 30
        gstRate: 5,
      },
    ];

    const result = calculateBillTotals(items);

    // 2 * 30 = 60 subtotal + 5% GST = 63
    expect(result.subtotal).toBe(60);
    expect(result.totalGst).toBe(3);
    expect(result.total).toBe(63);
    expect(result.billItems[0].lineTotal).toBe(63);
  });

  it("should handle items with zero-cost modifiers (e.g. Less Sugar, Jain)", () => {
    const items = [
      {
        quantity: 1,
        unitPrice: 100,
        modifiers: [
          { name: "No Sugar", price: 0 },
          { name: "No Onion", price: 0 },
        ],
        gstRate: 5,
      },
    ];

    const result = calculateBillTotals(items);

    expect(result.subtotal).toBe(100);
    expect(result.total).toBe(105);
  });

  it("should deduct bill-level discounts accurately from grand total", () => {
    const items = [
      {
        quantity: 2,
        unitPrice: 50,
        gstRate: 5, // 100 + 5 = 105
      },
    ];
    const discountAmount = 15; // ₹15 off promo

    const result = calculateBillTotals(items, undefined, discountAmount);

    expect(result.total).toBe(90); // 105 - 15 = 90
    expect(result.discountAmount).toBe(15);
  });
});
