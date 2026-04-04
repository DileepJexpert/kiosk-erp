import { db } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";

export async function createExpense(
  operatorId: string,
  kioskId: string,
  date: Date,
  amount: number,
  category: ExpenseCategory,
  description: string,
  receiptUrl?: string
) {
  return db.expense.create({
    data: {
      operatorId,
      kioskId,
      date,
      amount,
      category,
      description,
      receiptUrl,
    },
  });
}

export async function approveExpense(expenseId: string) {
  return db.expense.update({
    where: { id: expenseId },
    data: { approved: true },
  });
}

export async function getExpenseSummary(
  kioskId: string | undefined,
  startDate: Date,
  endDate: Date
) {
  const where: any = { date: { gte: startDate, lte: endDate } };
  if (kioskId) where.kioskId = kioskId;

  const expenses = await db.expense.findMany({
    where,
    include: { kiosk: true, operator: true },
    orderBy: { date: "desc" },
  });

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  return {
    expenses,
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    approved: expenses.filter((e) => e.approved).reduce((sum, e) => sum + e.amount, 0),
    pending: expenses.filter((e) => !e.approved).reduce((sum, e) => sum + e.amount, 0),
    byCategory,
  };
}
