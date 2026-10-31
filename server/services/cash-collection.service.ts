import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";

export function calculateDenominationsTotal(denominations: {
  c500?: number;
  c200?: number;
  c100?: number;
  c50?: number;
  c20?: number;
  c10?: number;
  coins?: number;
}): number {
  return (
    (denominations.c500 || 0) * 500 +
    (denominations.c200 || 0) * 200 +
    (denominations.c100 || 0) * 100 +
    (denominations.c50 || 0) * 50 +
    (denominations.c20 || 0) * 20 +
    (denominations.c10 || 0) * 10 +
    (denominations.coins || 0)
  );
}

export function calculateCashVariance(expectedCash: number, actualCash: number) {
  const shortage = expectedCash - actualCash;
  return {
    shortage,
    isBalanced: shortage === 0,
    isShortage: shortage > 0,
    isSurplus: shortage < 0,
    varianceAmount: Math.abs(shortage),
  };
}

export async function calculateExpectedCash(kioskId: string, date: Date) {
  const bills = await db.bill.findMany({
    where: { kioskId, date },
  });

  let expectedCash = 0;
  for (const bill of bills) {
    if (bill.paymentMode === "CASH") {
      expectedCash += bill.total;
    } else if (bill.paymentMode === "MIXED") {
      expectedCash += bill.cashAmount || 0;
    }
  }

  return expectedCash;
}

export async function recordCollection(
  kioskId: string,
  collectedById: string,
  date: Date,
  actualCash: number,
  shortageReason?: string
) {
  const expectedCash = await calculateExpectedCash(kioskId, date);
  const shortage = expectedCash - actualCash;

  return db.cashCollection.upsert({
    where: { kioskId_date: { kioskId, date } },
    create: {
      kioskId,
      collectedById,
      date,
      expectedCash,
      actualCash,
      shortage,
      shortageReason,
    },
    update: {
      actualCash,
      expectedCash,
      shortage,
      shortageReason,
    },
  });
}

export async function recordBlindCashDrop(
  kioskId: string,
  collectedById: string,
  date: Date,
  denominations: {
    c500?: number;
    c200?: number;
    c100?: number;
    c50?: number;
    c20?: number;
    c10?: number;
    coins?: number;
  },
  shortageReason?: string
) {
  const actualCash = calculateDenominationsTotal(denominations);

  const expectedCash = await calculateExpectedCash(kioskId, date);
  const shortage = expectedCash - actualCash;

  return db.cashCollection.upsert({
    where: { kioskId_date: { kioskId, date } },
    create: {
      kioskId,
      collectedById,
      date,
      expectedCash,
      actualCash,
      shortage,
      shortageReason,
      denominations: denominations as any,
      isBlindDrop: true,
    },
    update: {
      actualCash,
      expectedCash,
      shortage,
      shortageReason,
      denominations: denominations as any,
      isBlindDrop: true,
    },
  });
}

export async function markDeposited(collectionId: string, bankDepositRef: string) {
  return db.cashCollection.update({
    where: { id: collectionId },
    data: {
      depositedToBank: true,
      bankDepositRef,
      bankDepositDate: new Date(),
    },
  });
}

export async function getCollectionSummary(kioskId: string | undefined, startDate: Date, endDate: Date) {
  const where: any = { date: { gte: startDate, lte: endDate } };
  if (kioskId) where.kioskId = kioskId;

  const collections = await db.cashCollection.findMany({
    where,
    include: { kiosk: true, collectedBy: true },
    orderBy: { date: "desc" },
  });

  const totalExpected = collections.reduce((sum, c) => sum + c.expectedCash, 0);
  const totalActual = collections.reduce((sum, c) => sum + c.actualCash, 0);
  const totalShortage = collections.reduce((sum, c) => sum + c.shortage, 0);

  return {
    collections,
    totalExpected,
    totalActual,
    totalShortage,
    shortageCount: collections.filter((c) => c.shortage > 50).length,
  };
}
