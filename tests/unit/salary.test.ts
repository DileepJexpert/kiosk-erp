import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { computeNetSalary } from "@/server/services/salary.service";

describe("computeNetSalary", () => {
  it("should return base salary when there are no deductions", () => {
    expect(computeNetSalary(12000, 0, 0, 0, 0)).toBe(12000);
  });

  it("should deduct loss deductions from base salary", () => {
    expect(computeNetSalary(12000, 1500, 0)).toBe(10500);
  });

  it("should deduct advance deductions from base salary", () => {
    expect(computeNetSalary(12000, 0, 2000)).toBe(10000);
  });

  it("should deduct both losses and advances from base salary", () => {
    expect(computeNetSalary(12000, 1000, 2000)).toBe(9000);
  });

  it("should add bonus to net salary", () => {
    expect(computeNetSalary(12000, 500, 0, 1000)).toBe(12500);
  });

  it("should apply adjustments to net salary", () => {
    expect(computeNetSalary(12000, 0, 0, 0, -500)).toBe(11500);
  });

  it("should clamp net salary to zero when deductions exceed earnings", () => {
    expect(computeNetSalary(12000, 10000, 5000)).toBe(0);
  });

  it("should correctly compute with all components", () => {
    // 15000 - 2000 - 3000 + 500 + 200 = 10700
    expect(computeNetSalary(15000, 2000, 3000, 500, 200)).toBe(10700);
  });
});
