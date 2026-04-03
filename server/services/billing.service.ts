import { db } from "@/lib/db";
import { PaymentMode } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface BillItemInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export async function createBill(
  kioskId: string,
  operatorId: string,
  date: Date,
  items: BillItemInput[],
  paymentMode: PaymentMode = "CASH",
  customerName?: string,
  customerPhone?: string,
  notes?: string
) {
  if (items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bill must have at least one item",
    });
  }

  // Calculate totals
  const billItems = items.map((item) => ({
    itemId: item.itemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.quantity * item.unitPrice,
  }));

  const total = billItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return db.bill.create({
    data: {
      kioskId,
      operatorId,
      date,
      total,
      paymentMode,
      customerName,
      customerPhone,
      notes,
      items: {
        create: billItems,
      },
    },
    include: {
      items: { include: { item: true } },
    },
  });
}

export async function getDaySummary(kioskId: string, date: Date) {
  const bills = await db.bill.findMany({
    where: { kioskId, date },
    include: { items: true },
  });

  const totalRevenue = bills.reduce((sum, b) => sum + b.total, 0);
  const cashRevenue = bills
    .filter((b) => b.paymentMode === "CASH")
    .reduce((sum, b) => sum + b.total, 0);
  const upiRevenue = bills
    .filter((b) => b.paymentMode === "UPI")
    .reduce((sum, b) => sum + b.total, 0);
  const mixedRevenue = bills
    .filter((b) => b.paymentMode === "MIXED")
    .reduce((sum, b) => sum + b.total, 0);

  return {
    totalBills: bills.length,
    totalRevenue,
    cashRevenue,
    upiRevenue,
    mixedRevenue,
  };
}
