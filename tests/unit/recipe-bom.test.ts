import { describe, it, expect } from "vitest";

describe("Recipe Management & BOM Calculations", () => {
  it("should accurately calculate total ingredient cost and gross margin %", () => {
    const sellPrice = 20; // e.g. Masala Chai
    const ingredients = [
      { name: "Full Cream Milk", quantity: 100, costPerUnit: 0.06 }, // 6.00
      { name: "Assam CTC Tea Powder", quantity: 5, costPerUnit: 0.40 }, // 2.00
      { name: "Sugar", quantity: 10, costPerUnit: 0.045 }, // 0.45
      { name: "Paper Cup", quantity: 1, costPerUnit: 0.85 }, // 0.85
    ];

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.quantity * ing.costPerUnit, 0);
    expect(totalCost).toBeCloseTo(9.30, 2);

    const marginPercent = Math.round(((sellPrice - totalCost) / sellPrice) * 100);
    expect(marginPercent).toBe(54); // 53.5% rounded
  });

  it("should calculate theoretical consumption for 50 cups of chai", () => {
    const cupsSold = 50;
    const milkPerCup = 100; // ml
    const teaPerCup = 5; // g
    const cupsPerServing = 1;

    const theoreticalMilkLiters = (cupsSold * milkPerCup) / 1000;
    const theoreticalTeaKg = (cupsSold * teaPerCup) / 1000;
    const theoreticalCups = cupsSold * cupsPerServing;

    expect(theoreticalMilkLiters).toBe(5); // 5 Liters
    expect(theoreticalTeaKg).toBe(0.25); // 250 grams
    expect(theoreticalCups).toBe(50); // 50 paper cups
  });
});
