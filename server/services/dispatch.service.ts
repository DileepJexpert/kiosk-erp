import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";

export interface DispatchItemInput {
  itemId: string;
  quantity: number;
}

export async function getTemplateItems(kioskId: string): Promise<DispatchItemInput[]> {
  const kiosk = await db.kiosk.findUnique({
    where: { id: kioskId },
    include: {
      activeTemplate: {
        include: { items: { include: { item: true } } },
      },
    },
  });

  if (!kiosk?.activeTemplate) return [];

  return kiosk.activeTemplate.items
    .filter((ti) => ti.item.isActive)
    .map((ti) => ({
      itemId: ti.itemId,
      quantity: ti.defaultQty,
    }));
}

export async function createDispatch(
  kioskId: string,
  date: Date,
  createdById: string,
  items: DispatchItemInput[],
  notes?: string
) {
  if (items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Dispatch must have at least one item",
    });
  }

  // Check for duplicate dispatch
  const existing = await db.dispatch.findUnique({
    where: { kioskId_date: { kioskId, date } },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A dispatch already exists for this kiosk on this date",
    });
  }

  // Validate all items exist
  const itemIds = items.map((i) => i.itemId);
  const dbItems = await db.item.findMany({
    where: { id: { in: itemIds } },
  });

  if (dbItems.length !== itemIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "One or more items not found",
    });
  }

  // Create dispatch with items
  return db.dispatch.create({
    data: {
      kioskId,
      date,
      createdById,
      notes,
      items: {
        create: items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      items: { include: { item: true } },
      kiosk: true,
    },
  });
}

export async function bulkCreateDispatch(
  kioskIds: string[],
  date: Date,
  createdById: string,
  notes?: string
) {
  const results = [];

  for (const kioskId of kioskIds) {
    try {
      const templateItems = await getTemplateItems(kioskId);
      if (templateItems.length === 0) {
        continue; // Skip kiosks without templates
      }
      const dispatch = await createDispatch(kioskId, date, createdById, templateItems, notes);
      results.push({ kioskId, success: true, dispatch });
    } catch (error: any) {
      results.push({ kioskId, success: false, error: error.message });
    }
  }

  return results;
}
