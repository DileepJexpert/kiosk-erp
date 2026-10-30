import { describe, it, expect } from "vitest";
import { fuzzyMatchItem } from "@/server/services/fuzzy-matcher";

describe("fuzzyMatchItem", () => {
  const inventoryItems = [
    {
      id: "item-1",
      name: "Samosa",
      unit: "pcs",
      costPrice: 8,
      aliases: ["singhara", "samosha"],
      barcode: "8901234567890",
    },
    {
      id: "item-2",
      name: "Pav Bhaji",
      unit: "plate",
      costPrice: 40,
      aliases: ["bhaji pav", "pao bhaji"],
      barcode: null,
    },
    {
      id: "item-3",
      name: "Potato",
      unit: "kg",
      costPrice: 20,
      aliases: [],
      barcode: null,
    },
  ];

  const globalAliases = [
    {
      alias: "aloo",
      canonical: "Potato",
      category: "VEGETABLE",
    },
    {
      alias: "batata",
      canonical: "Potato",
      category: "VEGETABLE",
    },
  ];

  it("should match exactly by item name (Level 1)", () => {
    const result = fuzzyMatchItem("Samosa", inventoryItems, globalAliases);
    expect(result.itemId).toBe("item-1");
    expect(result.itemName).toBe("Samosa");
    expect(result.confidence).toBe(1.0);
    expect(result.matchLevel).toBe("exact");
  });

  it("should match case-insensitively", () => {
    const result = fuzzyMatchItem("sAmOsA", inventoryItems, globalAliases);
    expect(result.itemId).toBe("item-1");
    expect(result.confidence).toBe(1.0);
  });

  it("should match by item aliases (Level 2)", () => {
    const result = fuzzyMatchItem("singhara", inventoryItems, globalAliases);
    expect(result.itemId).toBe("item-1");
    expect(result.matchLevel).toBe("alias");
    expect(result.confidence).toBe(0.95);
  });

  it("should match by global Hindi/regional alias (Level 3)", () => {
    const result = fuzzyMatchItem("aloo", inventoryItems, globalAliases);
    expect(result.itemId).toBe("item-3");
    expect(result.itemName).toBe("Potato");
    expect(result.matchLevel).toBe("global_alias");
    expect(result.confidence).toBe(0.9);
  });

  it("should match partial/contains names (Level 4)", () => {
    const result = fuzzyMatchItem("Fresh Samosa Hot", inventoryItems, globalAliases);
    expect(result.itemId).toBe("item-1");
    expect(result.matchLevel).toBe("partial");
    expect(result.confidence).toBe(0.7);
  });

  it("should return matchLevel none when no item matches", () => {
    const result = fuzzyMatchItem("Unknown Exotic Fruit", inventoryItems, globalAliases);
    expect(result.itemId).toBeNull();
    expect(result.matchLevel).toBe("none");
    expect(result.confidence).toBe(0);
  });

  it("should return none for empty input", () => {
    const result = fuzzyMatchItem("   ", inventoryItems, globalAliases);
    expect(result.itemId).toBeNull();
    expect(result.matchLevel).toBe("none");
  });
});
