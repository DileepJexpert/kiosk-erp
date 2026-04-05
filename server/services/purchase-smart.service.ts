/**
 * Smart Purchase Services — Price validation, duplicate detection,
 * auto-price updates, template suggestions
 */

import { PrismaClient } from "@prisma/client";

// ──────── Price Validation ────────

export interface PriceAlert {
  itemId: string;
  itemName: string;
  lastPrice: number;
  newPrice: number;
  percentChange: number;
  message: string;
}

export async function validatePrices(
  items: { matchedItemId: string | null; unitPrice: number }[],
  db: PrismaClient
): Promise<PriceAlert[]> {
  const alerts: PriceAlert[] = [];

  for (const item of items) {
    if (!item.matchedItemId || !item.unitPrice) continue;

    const dbItem = await db.item.findUnique({
      where: { id: item.matchedItemId },
      select: { name: true, lastPurchasePrice: true },
    });

    if (dbItem?.lastPurchasePrice && dbItem.lastPurchasePrice > 0) {
      const priceDiff =
        ((item.unitPrice - dbItem.lastPurchasePrice) / dbItem.lastPurchasePrice) * 100;

      if (Math.abs(priceDiff) > 10) {
        alerts.push({
          itemId: item.matchedItemId,
          itemName: dbItem.name,
          lastPrice: dbItem.lastPurchasePrice,
          newPrice: item.unitPrice,
          percentChange: Math.round(priceDiff),
          message: `${dbItem.name}: Price ${priceDiff > 0 ? "up" : "down"} ${Math.abs(Math.round(priceDiff))}% (₹${dbItem.lastPurchasePrice} → ₹${item.unitPrice})`,
        });
      }
    }
  }

  return alerts;
}

// ──────── Duplicate Detection ────────

export async function checkDuplicate(
  supplierId: string | null,
  date: Date,
  totalAmount: number,
  db: PrismaClient
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  if (!supplierId) return { isDuplicate: false };

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existing = await db.purchase.findFirst({
    where: {
      supplierId,
      date: { gte: startOfDay, lte: endOfDay },
      totalAmount: {
        gte: totalAmount * 0.9,
        lte: totalAmount * 1.1,
      },
    },
    select: { id: true },
  });

  return existing
    ? { isDuplicate: true, existingId: existing.id }
    : { isDuplicate: false };
}

// ──────── Auto-Update Item Prices ────────

export async function updateItemPrices(
  purchaseItems: { itemId: string; unitPrice: number }[],
  supplierId: string,
  db: PrismaClient
): Promise<void> {
  for (const pi of purchaseItems) {
    const item = await db.item.findUnique({
      where: { id: pi.itemId },
      select: { avgPurchasePrice: true },
    });

    const currentAvg = item?.avgPurchasePrice || pi.unitPrice;
    const newAvg = currentAvg * 0.8 + pi.unitPrice * 0.2;

    await db.item.update({
      where: { id: pi.itemId },
      data: {
        lastPurchasePrice: pi.unitPrice,
        avgPurchasePrice: Math.round(newAvg * 100) / 100,
        preferredSupplierId: supplierId,
      },
    });
  }
}

// ──────── Template Suggestion ────────

export async function checkTemplateSuggestion(
  supplierId: string,
  db: PrismaClient
): Promise<boolean> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [purchaseCount, existingTemplate] = await Promise.all([
    db.purchase.count({
      where: { supplierId, createdAt: { gte: ninetyDaysAgo } },
    }),
    db.purchaseTemplate.findFirst({
      where: { supplierId },
    }),
  ]);

  return purchaseCount >= 3 && !existingTemplate;
}
