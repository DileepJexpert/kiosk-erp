import { describe, it, expect } from "vitest";
import {
  calculateWastage,
  isWithinMargin,
  calculateChargeableLoss,
  calculateLossAmount,
} from "@/server/services/margin.service";

describe("calculateWastage", () => {
  it("should return correct wastage", () => {
    expect(calculateWastage(100, 85, 5)).toBe(10);
  });

  it("should return zero when all items accounted for", () => {
    expect(calculateWastage(100, 100, 0)).toBe(0);
  });
});

describe("isWithinMargin", () => {
  it("should return true when wastage equals margin", () => {
    expect(isWithinMargin(10, 10)).toBe(true);
  });

  it("should return false when wastage exceeds margin", () => {
    expect(isWithinMargin(11, 10)).toBe(false);
  });

  it("should return true when wastage is below margin", () => {
    expect(isWithinMargin(5, 10)).toBe(true);
  });
});

describe("calculateChargeableLoss", () => {
  it("should return excess wastage beyond margin", () => {
    expect(calculateChargeableLoss(15, 10)).toBe(5);
  });

  it("should return zero when wastage is within margin", () => {
    expect(calculateChargeableLoss(5, 10)).toBe(0);
  });
});

describe("calculateLossAmount", () => {
  it("should multiply chargeable loss by cost price", () => {
    expect(calculateLossAmount(5, 3)).toBe(15);
  });

  it("should return zero when there is no chargeable loss", () => {
    expect(calculateLossAmount(0, 3)).toBe(0);
  });
});
