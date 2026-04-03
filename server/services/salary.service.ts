import { db } from "@/lib/db";
import { TRPCError } from "@trpc/server";

export interface SalaryInput {
  operatorId: string;
  month: string; // "YYYY-MM"
  baseSalary: number;
  bonus?: number;
  adjustments?: number;
  adjustmentNotes?: string;
}

export function computeNetSalary(
  baseSalary: number,
  totalLossDeductions: number,
  totalAdvanceDeductions: number,
  bonus: number = 0,
  adjustments: number = 0
): number {
  const net = baseSalary - totalLossDeductions - totalAdvanceDeductions + bonus + adjustments;
  return Math.max(0, net); // Salary cannot go negative
}

export async function getMonthlyLossDeductions(
  operatorId: string,
  month: string
): Promise<number> {
  // Parse month to get date range
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0); // Last day of month

  // Find all kiosks where this operator works
  const kiosk = await db.kiosk.findFirst({
    where: { operatorId },
  });

  if (!kiosk) return 0;

  // Sum all reconciliation losses for this kiosk in the month
  const reconciliations = await db.reconciliation.findMany({
    where: {
      kioskId: kiosk.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
      status: "COMPLETED",
    },
    select: { totalLoss: true },
  });

  return reconciliations.reduce((sum, r) => sum + r.totalLoss, 0);
}

export async function getMonthlyAdvances(
  operatorId: string,
  month: string
): Promise<number> {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);

  const advances = await db.advance.findMany({
    where: {
      operatorId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { amount: true },
  });

  return advances.reduce((sum, a) => sum + a.amount, 0);
}

export async function generateMonthlySalary(input: SalaryInput) {
  const { operatorId, month, baseSalary, bonus = 0, adjustments = 0, adjustmentNotes } = input;

  // Check operator exists
  const operator = await db.user.findUnique({ where: { id: operatorId } });
  if (!operator || operator.role !== "OPERATOR") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Operator not found",
    });
  }

  // Calculate deductions
  const totalLossDed = await getMonthlyLossDeductions(operatorId, month);
  const totalAdvanceDed = await getMonthlyAdvances(operatorId, month);
  const netSalary = computeNetSalary(baseSalary, totalLossDed, totalAdvanceDed, bonus, adjustments);

  // Upsert salary record
  const salary = await db.salaryRecord.upsert({
    where: {
      operatorId_month: { operatorId, month },
    },
    create: {
      operatorId,
      month,
      baseSalary,
      totalLossDed,
      totalAdvanceDed,
      bonus,
      adjustments,
      adjustmentNotes,
      netSalary,
    },
    update: {
      baseSalary,
      totalLossDed,
      totalAdvanceDed,
      bonus,
      adjustments,
      adjustmentNotes,
      netSalary,
      status: "DRAFT",
    },
  });

  return salary;
}

export async function generateAllSalaries(month: string, defaultBaseSalary: number = 12000) {
  const operators = await db.user.findMany({
    where: { role: "OPERATOR", isActive: true },
  });

  const results = [];
  for (const op of operators) {
    const salary = await generateMonthlySalary({
      operatorId: op.id,
      month,
      baseSalary: defaultBaseSalary,
    });
    results.push(salary);
  }

  return results;
}
