import { db } from "@/lib/db";

/**
 * Anomaly Detection Rules (F9: Fraud Detection)
 * Runs on: reconciliation submit AND daily batch
 */

interface AnomalyAlert {
  type: string;
  severity: string;
  title: string;
  message: string;
  data: any;
  kioskId?: string;
  operatorId?: string;
}

// Rule 1: HIGH_WASTAGE — Operator avg wastage rate > 2× team average
async function checkHighWastage(date: Date): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const thirtyDaysAgo = new Date(date);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recons = await db.reconciliation.findMany({
    where: { date: { gte: thirtyDaysAgo, lte: date } },
    include: { items: true, operator: true, kiosk: true },
  });

  // Calculate per-operator wastage rate
  const operatorWastage: Record<string, { total: number; wasted: number; name: string; kioskId: string }> = {};
  for (const r of recons) {
    const opId = r.operatorId;
    if (!operatorWastage[opId]) operatorWastage[opId] = { total: 0, wasted: 0, name: r.operator.name, kioskId: r.kioskId };
    for (const item of r.items) {
      operatorWastage[opId].total += item.dispatched;
      operatorWastage[opId].wasted += item.wasted;
    }
  }

  const rates = Object.values(operatorWastage).map((o) => o.total > 0 ? o.wasted / o.total : 0);
  const teamAvg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;

  for (const [opId, data] of Object.entries(operatorWastage)) {
    const rate = data.total > 0 ? data.wasted / data.total : 0;
    if (teamAvg > 0 && rate > teamAvg * 2) {
      alerts.push({
        type: "HIGH_WASTAGE",
        severity: "HIGH",
        title: `High Wastage by ${data.name}`,
        message: `${data.name}'s wastage rate (${(rate * 100).toFixed(1)}%) is ${(rate / teamAvg).toFixed(1)}× team average`,
        data: { operatorId: opId, rate, teamAvg },
        kioskId: data.kioskId,
        operatorId: opId,
      });
    }
  }
  return alerts;
}

// Rule 2: BILLING_MISMATCH — Billed qty vs recon sold differs > 15%
async function checkBillingMismatch(date: Date): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const recons = await db.reconciliation.findMany({
    where: { date },
    include: { items: true, kiosk: true },
  });

  for (const recon of recons) {
    const bills = await db.bill.findMany({
      where: { kioskId: recon.kioskId, date },
      include: { items: true },
    });

    const billedQty: Record<string, number> = {};
    for (const bill of bills) {
      for (const bi of bill.items) {
        billedQty[bi.itemId] = (billedQty[bi.itemId] || 0) + bi.quantity;
      }
    }

    for (const ri of recon.items) {
      const billed = billedQty[ri.itemId] || 0;
      if (ri.sold > 0 && Math.abs(billed - ri.sold) / ri.sold > 0.15) {
        alerts.push({
          type: "BILLING_MISMATCH",
          severity: "CRITICAL",
          title: `Billing Mismatch at ${recon.kiosk.name}`,
          message: `Billed ${billed} vs reconciled ${ri.sold} (${Math.round(Math.abs(billed - ri.sold) / ri.sold * 100)}% off)`,
          data: { kioskId: recon.kioskId, itemId: ri.itemId, billed, reconSold: ri.sold },
          kioskId: recon.kioskId,
          operatorId: recon.operatorId,
        });
      }
    }
  }
  return alerts;
}

// Rule 3: CASH_SHORTAGE_PATTERN — Cash shortage > 3 times in one week
async function checkCashShortagePattern(date: Date): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const collections = await db.cashCollection.findMany({
    where: { date: { gte: sevenDaysAgo, lte: date }, shortage: { gt: 50 } },
    include: { kiosk: true },
  });

  const kioskShortages: Record<string, { count: number; name: string; operatorId: string }> = {};
  for (const c of collections) {
    if (!kioskShortages[c.kioskId]) kioskShortages[c.kioskId] = { count: 0, name: c.kiosk.name, operatorId: c.collectedById };
    kioskShortages[c.kioskId].count++;
  }

  for (const [kioskId, data] of Object.entries(kioskShortages)) {
    if (data.count >= 3) {
      alerts.push({
        type: "CASH_SHORTAGE_PATTERN",
        severity: "CRITICAL",
        title: `Repeated Cash Shortages at ${data.name}`,
        message: `${data.count} cash shortages in the past week at ${data.name}`,
        data: { kioskId, count: data.count },
        kioskId,
        operatorId: data.operatorId,
      });
    }
  }
  return alerts;
}

// Rule 4: SINGLE_ITEM_LEAKAGE — One item's wastage at one kiosk is 3× vs others
async function checkSingleItemLeakage(date: Date): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const recons = await db.reconciliation.findMany({
    where: { date },
    include: { items: true, kiosk: true },
  });

  // Group wastage by item across kiosks
  const itemWastage: Record<string, { kioskRates: Record<string, number>; kioskNames: Record<string, string> }> = {};
  for (const recon of recons) {
    for (const ri of recon.items) {
      if (!itemWastage[ri.itemId]) itemWastage[ri.itemId] = { kioskRates: {}, kioskNames: {} };
      if (ri.dispatched > 0) {
        itemWastage[ri.itemId].kioskRates[recon.kioskId] = ri.wasted / ri.dispatched;
        itemWastage[ri.itemId].kioskNames[recon.kioskId] = recon.kiosk.name;
      }
    }
  }

  for (const [itemId, data] of Object.entries(itemWastage)) {
    const rates = Object.values(data.kioskRates);
    if (rates.length < 2) continue;
    const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
    for (const [kioskId, rate] of Object.entries(data.kioskRates)) {
      if (avg > 0 && rate > avg * 3) {
        alerts.push({
          type: "SINGLE_ITEM_LEAKAGE",
          severity: "HIGH",
          title: `Item Leakage at ${data.kioskNames[kioskId]}`,
          message: `Item wastage at ${data.kioskNames[kioskId]} is ${(rate / avg).toFixed(1)}× average`,
          data: { kioskId, itemId, rate, avg },
          kioskId,
        });
      }
    }
  }
  return alerts;
}

// Rule 5: DISPATCH_COPY_PASTE — Exact same dispatch quantities for 5+ consecutive days
async function checkDispatchCopyPaste(date: Date): Promise<AnomalyAlert[]> {
  const alerts: AnomalyAlert[] = [];
  const fiveDaysAgo = new Date(date);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const kiosks = await db.kiosk.findMany({ where: { isActive: true } });

  for (const kiosk of kiosks) {
    const dispatches = await db.dispatch.findMany({
      where: { kioskId: kiosk.id, date: { gte: fiveDaysAgo, lte: date } },
      include: { items: { orderBy: { itemId: "asc" } } },
      orderBy: { date: "asc" },
    });

    if (dispatches.length < 5) continue;

    const signatures = dispatches.map((d) =>
      d.items.map((i) => `${i.itemId}:${i.quantity}`).join(",")
    );

    const allSame = signatures.every((s) => s === signatures[0]);
    if (allSame && signatures[0].length > 0) {
      alerts.push({
        type: "DISPATCH_COPY_PASTE",
        severity: "LOW",
        title: `Repeated Dispatch at ${kiosk.name}`,
        message: `Exact same dispatch for ${dispatches.length} consecutive days at ${kiosk.name}`,
        data: { kioskId: kiosk.id, days: dispatches.length },
        kioskId: kiosk.id,
      });
    }
  }
  return alerts;
}

/**
 * Run all anomaly detection rules for a given date
 */
export async function runAllAnomalyChecks(date: Date): Promise<{ alertsCreated: number }> {
  const allAlerts: AnomalyAlert[] = [];

  const results = await Promise.allSettled([
    checkHighWastage(date),
    checkBillingMismatch(date),
    checkCashShortagePattern(date),
    checkSingleItemLeakage(date),
    checkDispatchCopyPaste(date),
  ]);

  for (const result of results) {
    if (result.status === "fulfilled") {
      allAlerts.push(...result.value);
    }
  }

  if (allAlerts.length > 0) {
    await db.alert.createMany({ data: allAlerts });
  }

  return { alertsCreated: allAlerts.length };
}
