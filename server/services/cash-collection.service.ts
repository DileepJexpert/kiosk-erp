import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";

export async function calculateExpectedCash(kioskId: string, date: Date) {
  const bills = await db.bill.findMany({
    where: { kioskId, date },
  });

  // Expected cash = CASH bills total + cash portion of MIXED bills
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
  operatorId: string,
  date: Date,
  collectedCash: number,
  notes?: string
) {
  const expectedCash = await calculateExpectedCash(kioskId, date);
  const difference = collectedCash - expectedCash;

  return db.cashCollection.upsert({
    where: { kioskId_date: { kioskId, date } },
    create: {
      kioskId,
      operatorId,
      date,
      expectedCash,
      collectedCash,
      difference,
      status: "COLLECTED",
      collectedAt: new Date(),
      notes,
    },
    update: {
      collectedCash,
      expectedCash,
      difference,
      status: "COLLECTED",
      collectedAt: new Date(),
      notes,
    },
  });
}

export async function verifyCollection(collectionId: string) {
  return db.cashCollection.update({
    where: { id: collectionId },
    data: { status: "VERIFIED" },
  });
}

export async function getCollectionSummary(kioskId: string | undefined, startDate: Date, endDate: Date) {
  const where: any = { date: { gte: startDate, lte: endDate } };
  if (kioskId) where.kioskId = kioskId;

  const collections = await db.cashCollection.findMany({
    where,
    include: { kiosk: true, operator: true },
    orderBy: { date: "desc" },
  });

  const totalExpected = collections.reduce((sum, c) => sum + c.expectedCash, 0);
  const totalCollected = collections.reduce((sum, c) => sum + c.collectedCash, 0);
  const totalDifference = totalCollected - totalExpected;

  return {
    collections,
    totalExpected,
    totalCollected,
    totalDifference,
    shortages: collections.filter((c) => c.difference < -10).length,
  };
}
