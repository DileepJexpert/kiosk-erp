import { describe, it, expect, vi } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("@/lib/db", () => ({ db: {} }));

import { calculateReconItem } from "@/server/services/reconciliation.service";

describe("calculateReconItem", () => {
  it("should return no chargeable loss when wastage is within margin", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 85, returned: 5 },
      10,
      5
    );
    expect(result.wasted).toBe(10);
    expect(result.chargeableLoss).toBe(0);
    expect(result.lossAmount).toBe(0);
  });

  it("should calculate chargeable loss when wastage exceeds margin", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 80, returned: 5 },
      10,
      5
    );
    expect(result.wasted).toBe(15);
    expect(result.chargeableLoss).toBe(5);
    expect(result.lossAmount).toBe(25);
  });

  it("should return zero wastage when all items are accounted for", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 90, returned: 10 },
      10,
      5
    );
    expect(result.wasted).toBe(0);
    expect(result.chargeableLoss).toBe(0);
    expect(result.lossAmount).toBe(0);
  });

  it("should charge all wastage when margin is zero", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 85, returned: 5 },
      0,
      3
    );
    expect(result.wasted).toBe(10);
    expect(result.chargeableLoss).toBe(10);
    expect(result.lossAmount).toBe(30);
  });

  it("should return no chargeable loss at exact margin boundary", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 80, returned: 10 },
      10,
      5
    );
    expect(result.wasted).toBe(10);
    expect(result.chargeableLoss).toBe(0);
    expect(result.lossAmount).toBe(0);
  });

  it("should throw when sold + returned exceeds dispatched", () => {
    expect(() =>
      calculateReconItem(
        { dispatched: 100, sold: 60, returned: 50 },
        10,
        5
      )
    ).toThrow(TRPCError);
  });

  it("should return zero wastage when all items are returned", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 0, returned: 100 },
      10,
      5
    );
    expect(result.wasted).toBe(0);
    expect(result.chargeableLoss).toBe(0);
    expect(result.lossAmount).toBe(0);
  });

  it("should return zero wastage when all items are sold", () => {
    const result = calculateReconItem(
      { dispatched: 100, sold: 100, returned: 0 },
      10,
      5
    );
    expect(result.wasted).toBe(0);
    expect(result.chargeableLoss).toBe(0);
    expect(result.lossAmount).toBe(0);
  });
});
