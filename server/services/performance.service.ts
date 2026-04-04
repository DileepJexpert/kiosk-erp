import { db } from "@/lib/db";

/**
 * Operator Performance Scoring (F10)
 *
 * Score = (wastageScore × 0.30) + (revenueScore × 0.25)
 *       + (attendanceScore × 0.15) + (timelinessScore × 0.15)
 *       + (cashAccuracyScore × 0.15)
 *
 * Rating: 90-100=EXCELLENT, 75-89=GOOD, 60-74=AVERAGE, <60=NEEDS_ATTENTION
 */

export interface PerformanceScore {
  operatorId: string;
  operatorName: string;
  kioskName: string;
  wastageScore: number;
  revenueScore: number;
  attendanceScore: number;
  timelinessScore: number;
  cashAccuracyScore: number;
  totalScore: number;
  rating: string;
}

function getRating(score: number): string {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 60) return "AVERAGE";
  return "NEEDS_ATTENTION";
}

export async function calculatePerformanceScore(
  operatorId: string,
  month: string
): Promise<PerformanceScore | null> {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);

  const operator = await db.user.findUnique({
    where: { id: operatorId },
    include: { assignedKiosk: true },
  });
  if (!operator || !operator.assignedKiosk) return null;

  const kioskId = operator.assignedKiosk.id;

  // 1. Wastage Score (30%)
  const recons = await db.reconciliation.findMany({
    where: { operatorId, date: { gte: startDate, lte: endDate } },
    include: { items: true },
  });
  let totalDispatched = 0;
  let totalWasted = 0;
  for (const r of recons) {
    for (const ri of r.items) {
      totalDispatched += ri.dispatched;
      totalWasted += ri.wasted;
    }
  }
  const avgWastageRate = totalDispatched > 0 ? totalWasted / totalDispatched : 0;
  const wastageScore = Math.max(0, Math.min(100, 100 - avgWastageRate * 1000));

  // 2. Revenue Score (25%)
  const bills = await db.bill.findMany({
    where: { operatorId, date: { gte: startDate, lte: endDate } },
  });
  const actualRevenue = bills.reduce((sum, b) => sum + b.total, 0);
  // Use a target of ₹5000/day × working days as baseline
  const workingDays = endDate.getDate();
  const targetRevenue = 5000 * workingDays;
  const revenueScore = Math.min(100, (actualRevenue / targetRevenue) * 100);

  // 3. Attendance Score (15%)
  const attendances = await db.attendance.findMany({
    where: { operatorId, date: { gte: startDate, lte: endDate } },
  });
  const presentDays = attendances.filter((a) =>
    a.status === "PRESENT" || a.status === "HALF_DAY"
  ).length;
  const attendanceScore = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;

  // 4. Timeliness Score (15%) — % of reconciliations done before 10 PM
  const totalRecons = recons.length;
  const onTimeRecons = recons.filter((r) => new Date(r.createdAt).getHours() < 22).length;
  const timelinessScore = totalRecons > 0 ? (onTimeRecons / totalRecons) * 100 : 100;

  // 5. Cash Accuracy Score (15%)
  const cashCollections = await db.cashCollection.findMany({
    where: { kioskId, date: { gte: startDate, lte: endDate } },
  });
  const totalCashCollected = cashCollections.reduce((sum, c) => sum + c.expectedCash, 0);
  const totalShortage = cashCollections.reduce((sum, c) => sum + Math.max(0, c.shortage), 0);
  const cashAccuracyScore = totalCashCollected > 0
    ? Math.max(0, 100 - (totalShortage / totalCashCollected) * 100)
    : 100;

  // Total Score
  const totalScore = Math.round(
    wastageScore * 0.3 +
    revenueScore * 0.25 +
    attendanceScore * 0.15 +
    timelinessScore * 0.15 +
    cashAccuracyScore * 0.15
  );

  return {
    operatorId,
    operatorName: operator.name,
    kioskName: operator.assignedKiosk.name,
    wastageScore: Math.round(wastageScore),
    revenueScore: Math.round(revenueScore),
    attendanceScore: Math.round(attendanceScore),
    timelinessScore: Math.round(timelinessScore),
    cashAccuracyScore: Math.round(cashAccuracyScore),
    totalScore,
    rating: getRating(totalScore),
  };
}

export async function getLeaderboard(month: string): Promise<PerformanceScore[]> {
  const operators = await db.user.findMany({
    where: { role: "OPERATOR", isActive: true },
  });

  const scores: PerformanceScore[] = [];
  for (const op of operators) {
    const score = await calculatePerformanceScore(op.id, month);
    if (score) scores.push(score);
  }

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}
