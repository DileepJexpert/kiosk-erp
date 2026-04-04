import { db } from "@/lib/db";

/**
 * GST Compliance Service (F3)
 */

export interface GSTSummary {
  totalSales: number;
  taxableValue: number;
  totalGST: number;
  totalCGST: number;
  totalSGST: number;
  billCount: number;
}

export async function getMonthlyGSTSummary(
  month: string,
  kioskId?: string
): Promise<GSTSummary> {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);

  const where: any = { date: { gte: startDate, lte: endDate } };
  if (kioskId) where.kioskId = kioskId;

  const bills = await db.bill.findMany({ where });

  return {
    totalSales: bills.reduce((sum, b) => sum + b.total, 0),
    taxableValue: bills.reduce((sum, b) => sum + b.subtotal, 0),
    totalGST: bills.reduce((sum, b) => sum + b.gstAmount, 0),
    totalCGST: bills.reduce((sum, b) => sum + b.cgstAmount, 0),
    totalSGST: bills.reduce((sum, b) => sum + b.sgstAmount, 0),
    billCount: bills.length,
  };
}

export interface HSNSummary {
  hsnCode: string;
  itemName: string;
  gstRate: number;
  taxableValue: number;
  gstAmount: number;
  quantity: number;
}

export async function getHSNWiseSummary(
  month: string,
  kioskId?: string
): Promise<HSNSummary[]> {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);

  const where: any = { bill: { date: { gte: startDate, lte: endDate } } };
  if (kioskId) where.bill.kioskId = kioskId;

  const billItems = await db.billItem.findMany({
    where,
    include: { item: true },
  });

  const hsnMap: Record<string, HSNSummary> = {};
  for (const bi of billItems) {
    const key = bi.item.hsnCode || "NO_HSN";
    if (!hsnMap[key]) {
      hsnMap[key] = {
        hsnCode: bi.item.hsnCode || "-",
        itemName: bi.item.name,
        gstRate: bi.gstRate,
        taxableValue: 0,
        gstAmount: 0,
        quantity: 0,
      };
    }
    hsnMap[key].taxableValue += bi.lineTotal - bi.gstAmount;
    hsnMap[key].gstAmount += bi.gstAmount;
    hsnMap[key].quantity += bi.quantity;
  }

  return Object.values(hsnMap);
}

export interface GSTR1Row {
  billNumber: number;
  date: string;
  total: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  customerGSTIN: string;
}

export async function generateGSTR1(
  month: string,
  kioskId?: string
): Promise<GSTR1Row[]> {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);

  const where: any = { date: { gte: startDate, lte: endDate } };
  if (kioskId) where.kioskId = kioskId;

  const bills = await db.bill.findMany({
    where,
    orderBy: { billNumber: "asc" },
  });

  return bills.map((b) => ({
    billNumber: b.billNumber,
    date: b.date.toISOString().split("T")[0],
    total: b.total,
    taxableValue: b.subtotal,
    cgst: b.cgstAmount,
    sgst: b.sgstAmount,
    customerGSTIN: "",
  }));
}
