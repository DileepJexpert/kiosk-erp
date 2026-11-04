import { db } from "@/lib/db";
import { PaymentMode, OrderChannel } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export interface ModifierOption {
  name: string;
  price: number;
}

export interface BillItemInput {
  itemId: string;
  quantity: number;
  unitPrice: number;
  modifiers?: ModifierOption[];
  notes?: string;
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
  orderType?: string; // DINE_IN, TAKEAWAY, DELIVERY
  discountAmount?: number;
  discountReason?: string;
  tenderAmount?: number;
  changeReturned?: number;
}

export function calculateBillTotals(
  items: { quantity: number; unitPrice: number; gstRate?: number; modifiers?: ModifierOption[] }[],
  channelCommissionRate?: number,
  discountAmount = 0
) {
  const billItems = items.map((item) => {
    const modifierTotal = item.modifiers?.reduce((sum, m) => sum + (m.price || 0), 0) || 0;
    const effectiveUnitPrice = item.unitPrice + modifierTotal;
    const lineSubtotal = item.quantity * effectiveUnitPrice;
    const gstRate = item.gstRate ?? 5;
    const gstAmount = Math.round(lineSubtotal * (gstRate / 100) * 100) / 100;
    const lineTotal = lineSubtotal + gstAmount;
    return {
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      effectiveUnitPrice,
      modifiers: item.modifiers,
      lineTotal,
      gstRate,
      gstAmount,
    };
  });

  const subtotal = billItems.reduce((sum, item) => sum + (item.lineTotal - item.gstAmount), 0);
  const totalGst = billItems.reduce((sum, item) => sum + item.gstAmount, 0);
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const sgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const calculatedTotal = subtotal + totalGst;
  const total = Math.max(0, Math.round((calculatedTotal - discountAmount) * 100) / 100);

  let channelCommission: number | undefined;
  let netRevenue: number | undefined;
  if (channelCommissionRate) {
    channelCommission = Math.round(total * (channelCommissionRate / 100) * 100) / 100;
    netRevenue = total - channelCommission;
  } else {
    netRevenue = total;
  }

  return {
    billItems,
    subtotal,
    totalGst,
    cgstAmount,
    sgstAmount,
    total,
    discountAmount,
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
      modifiers: i.modifiers,
      gstRate: gstMap.get(i.itemId) || 5,
    })),
    options?.channelCommissionRate,
    options?.discountAmount || 0
  );

  const billItemsToCreate = items.map((item, index) => ({
    itemId: item.itemId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    modifiers: item.modifiers ? (item.modifiers as any) : undefined,
    notes: item.notes,
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
      discountAmount: options?.discountAmount || 0,
      discountReason: options?.discountReason,
      tenderAmount: options?.tenderAmount,
      changeReturned: options?.changeReturned,
      orderType: options?.orderType || "DINE_IN",
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
      kiosk: true,
      operator: true,
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

export async function generateZReport(kioskId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const kiosk = await db.kiosk.findUniqueOrThrow({
    where: { id: kioskId },
    include: { operator: true },
  });

  const bills = await db.bill.findMany({
    where: {
      kioskId,
      date,
    },
    include: {
      items: { include: { item: true } },
      operator: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const cashCollection = await db.cashCollection.findUnique({
    where: { kioskId_date: { kioskId, date } },
  });

  const expenses = await db.expense.findMany({
    where: {
      kioskId,
      date,
    },
  });

  const activeBills = bills.filter((b) => b.orderStatus !== "CANCELLED");
  const cancelledBills = bills.filter((b) => b.orderStatus === "CANCELLED");

  const grossSales = activeBills.reduce((sum, b) => sum + (b.subtotal + b.gstAmount), 0);
  const totalDiscounts = activeBills.reduce((sum, b) => sum + (b.discountAmount || 0), 0);
  const netRevenue = activeBills.reduce((sum, b) => sum + b.total, 0);
  const totalGst = activeBills.reduce((sum, b) => sum + b.gstAmount, 0);
  const cgst = activeBills.reduce((sum, b) => sum + b.cgstAmount, 0);
  const sgst = activeBills.reduce((sum, b) => sum + b.sgstAmount, 0);

  const cashBills = activeBills.filter((b) => b.paymentMode === "CASH");
  const upiBills = activeBills.filter((b) => b.paymentMode === "UPI");
  const mixedBills = activeBills.filter((b) => b.paymentMode === "MIXED");

  const cashRevenue =
    cashBills.reduce((sum, b) => sum + b.total, 0) +
    mixedBills.reduce((sum, b) => sum + (b.cashAmount || 0), 0);

  const upiRevenue =
    upiBills.reduce((sum, b) => sum + b.total, 0) +
    mixedBills.reduce((sum, b) => sum + (b.upiAmount || 0), 0);

  const dineInBills = activeBills.filter((b) => b.orderType === "DINE_IN");
  const takeawayBills = activeBills.filter((b) => b.orderType === "TAKEAWAY");
  const deliveryBills = activeBills.filter((b) => b.orderType === "DELIVERY");

  const totalPettyCashExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const expectedCashInDrawer = Math.max(0, cashRevenue - totalPettyCashExpenses);
  const actualCashCollected = cashCollection?.actualCash ?? 0;
  const cashShortage = cashCollection?.shortage ?? (expectedCashInDrawer - actualCashCollected);

  // Compute item sales ranking
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const bill of activeBills) {
    for (const bi of bill.items) {
      const existing = itemMap.get(bi.itemId) || {
        name: bi.item.name,
        quantity: 0,
        revenue: 0,
      };
      existing.quantity += bi.quantity;
      existing.revenue += bi.lineTotal;
      itemMap.set(bi.itemId, existing);
    }
  }

  const topItems = Array.from(itemMap.values()).sort((a, b) => b.revenue - a.revenue);

  return {
    reportNumber: `ZR-${kioskId.slice(-4).toUpperCase()}-${date.toISOString().split("T")[0]}`,
    generatedAt: new Date(),
    kiosk: {
      id: kiosk.id,
      name: kiosk.name,
      location: kiosk.location,
      gstin: kiosk.gstin || "NOT REGISTERED",
      fssai: kiosk.fssaiNumber || "10821000000000",
      operatorName: kiosk.operator?.name || "Counter Cashier",
    },
    shiftTimings: {
      firstBillTime: bills[0]?.createdAt || null,
      lastBillTime: bills[bills.length - 1]?.createdAt || null,
    },
    financials: {
      grossSales: Math.round(grossSales * 100) / 100,
      totalDiscounts: Math.round(totalDiscounts * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      aov: activeBills.length > 0 ? Math.round((netRevenue / activeBills.length) * 100) / 100 : 0,
    },
    payments: {
      cash: { count: cashBills.length, amount: cashRevenue },
      upi: { count: upiBills.length, amount: upiRevenue },
      mixed: { count: mixedBills.length, amount: mixedBills.reduce((s, b) => s + b.total, 0) },
    },
    orderTypes: {
      dineIn: { count: dineInBills.length, amount: dineInBills.reduce((s, b) => s + b.total, 0) },
      takeaway: { count: takeawayBills.length, amount: takeawayBills.reduce((s, b) => s + b.total, 0) },
      delivery: { count: deliveryBills.length, amount: deliveryBills.reduce((s, b) => s + b.total, 0) },
    },
    drawerReconciliation: {
      cashRevenue,
      totalPettyCashExpenses,
      expectedCashInDrawer,
      actualCashCollected,
      shortage: cashShortage,
      isBalanced: cashShortage === 0,
      denominations: cashCollection?.denominations || null,
    },
    metrics: {
      totalBills: activeBills.length,
      cancelledBillsCount: cancelledBills.length,
      cancelledAmount: cancelledBills.reduce((s, b) => s + b.total, 0),
    },
    topItems,
  };
}
