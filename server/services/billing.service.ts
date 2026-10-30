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
  upiTransactionRef?: string;
  cashAmount?: number;
  upiAmount?: number;
  orderChannel?: OrderChannel;
  channelOrderId?: string;
  channelCommissionRate?: number;
  customerName?: string;
  customerPhone?: string;
  customerId?: string;
  notes?: string;
}

export function calculateBillTotals(
  items: { quantity: number; unitPrice: number; gstRate?: number }[],
  channelCommissionRate?: number
) {
  const billItems = items.map((item) => {
    const lineSubtotal = item.quantity * item.unitPrice;
    const gstRate = item.gstRate ?? 5;
    const gstAmount = Math.round(lineSubtotal * (gstRate / 100) * 100) / 100;
    const lineTotal = lineSubtotal + gstAmount;
    return {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal,
      gstRate,
      gstAmount,
    };
  });

  const subtotal = billItems.reduce((sum, item) => sum + (item.lineTotal - item.gstAmount), 0);
  const totalGst = billItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const sgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const total = subtotal + totalGst;

  let channelCommission: number | undefined;
  let netRevenue: number | undefined;
  if (channelCommissionRate) {
    channelCommission = Math.round(total * (channelCommissionRate / 100) * 100) / 100;
    netRevenue = total - channelCommission;
  }

  return {
    billItems,
    subtotal,
    totalGst,
    cgstAmount,
    sgstAmount,
    total,
    channelCommission,
    netRevenue,
  };
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
    select: { id: true, gstRate: true },
  });
  const gstMap = new Map(dbItems.map((i) => [i.id, i.gstRate]));

  const calculation = calculateBillTotals(
    items.map((i) => ({
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      gstRate: gstMap.get(i.itemId) || 5,
    })),
    options?.channelCommissionRate
  );

  const billItemsToCreate = items.map((item, index) => ({
    itemId: item.itemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: calculation.billItems[index].lineTotal,
    gstRate: calculation.billItems[index].gstRate,
    gstAmount: calculation.billItems[index].gstAmount,
  }));

  return db.bill.create({
    data: {
      kioskId,
      operatorId,
      date,
      subtotal: calculation.subtotal,
      gstAmount: calculation.totalGst,
      cgstAmount: calculation.cgstAmount,
      sgstAmount: calculation.sgstAmount,
      total: calculation.total,
      paymentMode,
      paymentStatus: paymentMode === "CASH" ? "CONFIRMED" : "PENDING",
      upiTransactionRef: options?.upiTransactionRef,
      cashAmount: options?.cashAmount,
      upiAmount: options?.upiAmount,
      orderChannel: options?.orderChannel || "WALK_IN",
      channelOrderId: options?.channelOrderId,
      channelCommissionRate: options?.channelCommissionRate,
      channelCommission: calculation.channelCommission,
      netRevenue: calculation.netRevenue,
      customerName,
      customerPhone,
      customerId: options?.customerId,
      notes,
      items: {
        create: billItemsToCreate,
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
  const totalGst = bills.reduce((sum, b) => sum + b.gstAmount, 0);

  return {
    totalBills: bills.length,
    totalRevenue,
    cashRevenue,
    upiRevenue,
    mixedRevenue,
    totalGst,
  };
}
