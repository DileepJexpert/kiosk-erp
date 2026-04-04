import { db } from "@/lib/db";
import { PaymentMode, OrderChannel } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface BillItemInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateBillOptions {
  kioskId: string;
  operatorId: string;
  date: Date;
  items: BillItemInput[];
  paymentMode?: PaymentMode;
  upiRef?: string;
  cashAmount?: number;
  upiAmount?: number;
  orderChannel?: OrderChannel;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  notes?: string;
}

export async function createBill(
  kioskId: string,
  operatorId: string,
  date: Date,
  items: BillItemInput[],
  paymentMode: PaymentMode = "CASH",
  customerName?: string,
  customerPhone?: string,
  notes?: string,
  options?: Partial<CreateBillOptions>
) {
  if (items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Bill must have at least one item",
    });
  }

  // Fetch item GST rates
  const itemIds = items.map((i) => i.itemId);
  const dbItems = await db.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, gstPercent: true },
  });
  const gstMap = new Map(dbItems.map((i) => [i.id, i.gstPercent]));

  // Calculate totals with GST
  const billItems = items.map((item) => {
    const lineTotal = item.quantity * item.unitPrice;
    const gstPercent = gstMap.get(item.itemId) || 5;
    const gstAmount = Math.round((lineTotal * gstPercent) / (100 + gstPercent) * 100) / 100;
    return {
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
      gstPercent,
      gstAmount,
    };
  });

  const subtotal = billItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalGst = billItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst / 2) * 100) / 100;

  return db.bill.create({
    data: {
      kioskId,
      operatorId,
      date,
      subtotal,
      cgst,
      sgst,
      total: subtotal,
      paymentMode,
      upiRef: options?.upiRef,
      cashAmount: options?.cashAmount,
      upiAmount: options?.upiAmount,
      orderChannel: options?.orderChannel || "WALK_IN",
      customerName,
      customerPhone,
      customerId: options?.customerId,
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
