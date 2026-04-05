/**
 * Fuzzy Item Matcher — 4-level matching for AI-extracted item names
 *
 * Level 1: Exact name match
 * Level 2: Item aliases match (item.aliases array)
 * Level 3: Global alias table match (ItemAliasGlobal)
 * Level 4: Partial/contains match
 */

import { PrismaClient } from "@prisma/client";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  costPrice: number;
  aliases: string[];
  barcode: string | null;
}

interface AliasEntry {
  alias: string;
  canonical: string;
  category: string;
}

export interface MatchResult {
  itemId: string | null;
  itemName: string | null;
  confidence: number; // 0.0 - 1.0
  matchLevel: "exact" | "alias" | "global_alias" | "partial" | "none";
}

/**
 * Match a raw extracted text to an inventory item
 */
export function fuzzyMatchItem(
  rawText: string,
  inventoryItems: InventoryItem[],
  globalAliases: AliasEntry[]
): MatchResult {
  const normalized = rawText.toLowerCase().trim();
  if (!normalized) return { itemId: null, itemName: null, confidence: 0, matchLevel: "none" };

  // Level 1: Exact name match
  const exact = inventoryItems.find(
    (i) => i.name.toLowerCase() === normalized
  );
  if (exact) {
    return { itemId: exact.id, itemName: exact.name, confidence: 1.0, matchLevel: "exact" };
  }

  // Level 2: Item aliases match
  const aliasItem = inventoryItems.find((i) =>
    i.aliases.some((a) => a.toLowerCase() === normalized)
  );
  if (aliasItem) {
    return { itemId: aliasItem.id, itemName: aliasItem.name, confidence: 0.95, matchLevel: "alias" };
  }

  // Level 3: Global alias table match
  const globalMatch = globalAliases.find(
    (a) => a.alias.toLowerCase() === normalized
  );
  if (globalMatch) {
    const item = inventoryItems.find(
      (i) => i.name.toLowerCase() === globalMatch.canonical.toLowerCase()
    );
    if (item) {
      return { itemId: item.id, itemName: item.name, confidence: 0.9, matchLevel: "global_alias" };
    }
  }

  // Level 4: Partial / contains match
  // 4a: Inventory name contains the raw text
  const partialContains = inventoryItems.find(
    (i) =>
      i.name.toLowerCase().includes(normalized) ||
      normalized.includes(i.name.toLowerCase())
  );
  if (partialContains) {
    return {
      itemId: partialContains.id,
      itemName: partialContains.name,
      confidence: 0.7,
      matchLevel: "partial",
    };
  }

  // 4b: Check if global canonical name partially matches
  const globalPartial = globalAliases.find(
    (a) =>
      a.alias.toLowerCase().includes(normalized) ||
      normalized.includes(a.alias.toLowerCase())
  );
  if (globalPartial) {
    const item = inventoryItems.find(
      (i) => i.name.toLowerCase() === globalPartial.canonical.toLowerCase()
    );
    if (item) {
      return { itemId: item.id, itemName: item.name, confidence: 0.6, matchLevel: "partial" };
    }
  }

  // 4c: Word-level overlap scoring
  const rawWords = normalized.split(/\s+/);
  let bestScore = 0;
  let bestItem: InventoryItem | null = null;
  for (const item of inventoryItems) {
    const itemWords = item.name.toLowerCase().split(/\s+/);
    const overlap = rawWords.filter((w) =>
      itemWords.some((iw) => iw.includes(w) || w.includes(iw))
    ).length;
    const score = overlap / Math.max(rawWords.length, itemWords.length);
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestItem = item;
    }
  }
  if (bestItem) {
    return {
      itemId: bestItem.id,
      itemName: bestItem.name,
      confidence: Math.round(bestScore * 0.7 * 100) / 100,
      matchLevel: "partial",
    };
  }

  return { itemId: null, itemName: null, confidence: 0, matchLevel: "none" };
}

/**
 * Load inventory items and global aliases for matching
 */
export async function loadMatchingContext(db: PrismaClient) {
  const [items, aliases] = await Promise.all([
    db.item.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        unit: true,
        costPrice: true,
        aliases: true,
        barcode: true,
      },
    }),
    db.itemAliasGlobal.findMany({
      select: { alias: true, canonical: true, category: true },
    }),
  ]);

  return { items: items as InventoryItem[], aliases: aliases as AliasEntry[] };
}

/**
 * Match multiple extracted items against inventory
 */
export function fuzzyMatchAll(
  rawTexts: string[],
  inventoryItems: InventoryItem[],
  globalAliases: AliasEntry[]
): MatchResult[] {
  return rawTexts.map((raw) => fuzzyMatchItem(raw, inventoryItems, globalAliases));
}
