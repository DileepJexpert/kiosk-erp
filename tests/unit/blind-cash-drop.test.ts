import { describe, it, expect } from "vitest";
import {
  calculateDenominationsTotal,
  calculateCashVariance,
} from "@/server/services/cash-collection.service";

describe("Blind Cash Drop Calculations", () => {
  it("should accurately calculate total from mixed denominations", () => {
    const denominations = {
      c500: 4,  // 2000
      c200: 5,  // 1000
      c100: 10, // 1000
      c50: 6,   // 300
      c20: 15,  // 300
      c10: 25,  // 250
      coins: 45,// 45
    };

    const total = calculateDenominationsTotal(denominations);
    expect(total).toBe(4895);
  });

  it("should handle partial or missing denomination fields safely", () => {
    const denominations = {
      c500: 2, // 1000
      c100: 3, // 300
    };

    const total = calculateDenominationsTotal(denominations);
    expect(total).toBe(1300);
  });

  it("should return zero when all denominations are zero or empty", () => {
    expect(calculateDenominationsTotal({})).toBe(0);
  });

  describe("calculateCashVariance (Anti-Theft Variance Analysis)", () => {
    it("should identify perfectly balanced cash drops", () => {
      const variance = calculateCashVariance(3500, 3500);
      expect(variance.isBalanced).toBe(true);
      expect(variance.shortage).toBe(0);
      expect(variance.isShortage).toBe(false);
      expect(variance.isSurplus).toBe(false);
    });

    it("should calculate cash shortage accurately when drawer is short", () => {
      // Expected ₹4000 from sales, but operator dropped ₹3800
      const variance = calculateCashVariance(4000, 3800);
      expect(variance.isBalanced).toBe(false);
      expect(variance.shortage).toBe(200);
      expect(variance.isShortage).toBe(true);
      expect(variance.isSurplus).toBe(false);
      expect(variance.varianceAmount).toBe(200);
    });

    it("should identify cash surplus when extra cash is dropped", () => {
      // Expected ₹2500, operator dropped ₹2650
      const variance = calculateCashVariance(2500, 2650);
      expect(variance.isBalanced).toBe(false);
      expect(variance.shortage).toBe(-150);
      expect(variance.isShortage).toBe(false);
      expect(variance.isSurplus).toBe(true);
      expect(variance.varianceAmount).toBe(150);
    });
  });
});
