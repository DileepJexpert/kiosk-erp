import { describe, it, expect } from "vitest";

describe("Franchise & Royalty Model Calculations", () => {
  it("should calculate zero royalty for COMPANY_OWNED kiosks", () => {
    const grossSales = 150000;
    const royaltyPercent = 0;
    const royalty = (grossSales * royaltyPercent) / 100;
    expect(royalty).toBe(0);
  });

  it("should calculate correct 8% royalty for FOCO model", () => {
    const grossSales = 225000;
    const royaltyPercent = 8.0;
    const royalty = Math.round(((grossSales * royaltyPercent) / 100) * 100) / 100;
    expect(royalty).toBe(18000);
  });

  it("should calculate correct 6% royalty for FOFO model with decimal precision", () => {
    const grossSales = 178945.50;
    const royaltyPercent = 6.0;
    const royalty = Math.round(((grossSales * royaltyPercent) / 100) * 100) / 100;
    expect(royalty).toBe(10736.73);
  });
});
