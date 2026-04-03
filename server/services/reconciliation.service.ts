import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";

export interface ReconItemInput {
  itemId: string;
  dispatched: number;
  sold: number;
  returned: number;
}

export interface ReconItemResult {
  itemId: string;
  dispatched: number;
  sold: number;
  returned: number;
  wasted: number;
  allowedMargin: number;
  chargeableLoss: number;
  lossAmount: number;
}

export function calculateReconItem(
  input: { dispatched: number; sold: number; returned: number },
  dailyMargin: number,
  costPrice: number
): { wasted: number; chargeableLoss: number; lossAmount: number } {
  const wasted = input.dispatched - input.sold - input.returned;

  if (wasted < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid: sold (${input.sold}) + returned (${input.returned}) exceeds dispatched (${input.dispatched})`,
    });
  }

  const chargeableLoss = Math.max(0, wasted - dailyMargin);
  const lossAmount = chargeableLoss * costPrice;

  return { wasted, chargeableLoss, lossAmount };
}

export async function processReconciliation(
  dispatchId: string,
  operatorId: string,
  items: ReconItemInput[],
  notes?: string
) {
  // Get the dispatch with its items
  const dispatch = await db.dispatch.findUnique({
    where: { id: dispatchId },
    include: {
      items: { include: { item: true } },
      kiosk: true,
      reconciliation: true,
    },
  });

  if (!dispatch) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Dispatch not found" });
  }

  if (dispatch.reconciliation) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This dispatch has already been reconciled",
    });
  }

  if (dispatch.status === "PENDING") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Dispatch must be confirmed before reconciliation",
    });
  }

  // Build a map of dispatch items for validation
  const dispatchItemMap = new Map(
    dispatch.items.map((di) => [di.itemId, di])
  );

  // Calculate losses for each item
  const reconItems: ReconItemResult[] = [];
  let totalLoss = 0;

  for (const input of items) {
    const dispatchItem = dispatchItemMap.get(input.itemId);
    if (!dispatchItem) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Item ${input.itemId} was not in this dispatch`,
      });
    }

    // Validate dispatched quantity matches
    if (input.dispatched !== dispatchItem.quantity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Dispatched quantity mismatch for ${dispatchItem.item.name}`,
      });
    }

    const { wasted, chargeableLoss, lossAmount } = calculateReconItem(
      input,
      dispatchItem.item.dailyMargin,
      dispatchItem.item.costPrice
    );

    reconItems.push({
      itemId: input.itemId,
      dispatched: input.dispatched,
      sold: input.sold,
      returned: input.returned,
      wasted,
      allowedMargin: dispatchItem.item.dailyMargin,
      chargeableLoss,
      lossAmount,
    });

    totalLoss += lossAmount;
  }

  // Create reconciliation in a transaction
  const result = await db.$transaction(async (tx) => {
    const reconciliation = await tx.reconciliation.create({
      data: {
        date: dispatch.date,
        dispatchId: dispatch.id,
        kioskId: dispatch.kioskId,
        operatorId,
        totalLoss,
        notes,
        items: {
          create: reconItems.map((item) => ({
            itemId: item.itemId,
            dispatched: item.dispatched,
            sold: item.sold,
            returned: item.returned,
            wasted: item.wasted,
            allowedMargin: item.allowedMargin,
            chargeableLoss: item.chargeableLoss,
            lossAmount: item.lossAmount,
          })),
        },
      },
      include: { items: { include: { item: true } } },
    });

    // Update dispatch status
    await tx.dispatch.update({
      where: { id: dispatchId },
      data: { status: "RECONCILED" },
    });

    return reconciliation;
  });

  return result;
}

export async function crossValidateWithBills(
  kioskId: string,
  date: Date,
  reconItems: ReconItemResult[]
): Promise<{ itemId: string; itemName: string; reconSold: number; billedQty: number; diffPercent: number }[]> {
  // Get all bills for this kiosk on this date
  const bills = await db.bill.findMany({
    where: { kioskId, date },
    include: { items: true },
  });

  // Sum billed quantities per item
  const billedQtyMap = new Map<string, number>();
  for (const bill of bills) {
    for (const bi of bill.items) {
      billedQtyMap.set(bi.itemId, (billedQtyMap.get(bi.itemId) || 0) + bi.quantity);
    }
  }

  const warnings: { itemId: string; itemName: string; reconSold: number; billedQty: number; diffPercent: number }[] = [];

  for (const ri of reconItems) {
    const billedQty = billedQtyMap.get(ri.itemId) || 0;
    if (ri.sold === 0 && billedQty === 0) continue;

    const diff = Math.abs(ri.sold - billedQty);
    const base = Math.max(ri.sold, billedQty, 1);
    const diffPercent = (diff / base) * 100;

    if (diffPercent > 10) {
      const item = await db.item.findUnique({ where: { id: ri.itemId } });
      warnings.push({
        itemId: ri.itemId,
        itemName: item?.name || "Unknown",
        reconSold: ri.sold,
        billedQty,
        diffPercent: Math.round(diffPercent),
      });
    }
  }

  return warnings;
}
