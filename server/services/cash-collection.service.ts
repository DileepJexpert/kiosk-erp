import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";

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
