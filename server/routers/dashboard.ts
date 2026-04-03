import { z } from "zod";
import { createTRPCRouter, managerProcedure } from "../trpc";

export const dashboardRouter = createTRPCRouter({
  getOverview: managerProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalKiosks,
      activeKiosks,
      todayDispatches,
      pendingReconciliations,
      todayBills,
      todayRevenue,
    ] = await Promise.all([
      ctx.db.kiosk.count(),
      ctx.db.kiosk.count({ where: { isActive: true } }),
      ctx.db.dispatch.count({ where: { date: today } }),
      ctx.db.dispatch.count({
        where: { status: { in: ["PENDING", "CONFIRMED"] }, reconciliation: null },
      }),
      ctx.db.bill.count({ where: { date: today } }),
      ctx.db.bill.aggregate({ where: { date: today }, _sum: { total: true } }),
    ]);

    // Today's losses
    const todayRecons = await ctx.db.reconciliation.findMany({
      where: { date: today },
      select: { totalLoss: true },
    });
    const todayLosses = todayRecons.reduce((sum, r) => sum + r.totalLoss, 0);

    return {
      totalKiosks,
      activeKiosks,
      todayDispatches,
      pendingReconciliations,
      todayBills,
      todayRevenue: todayRevenue._sum.total || 0,
      todayLosses,
    };
  }),

  getKioskStatus: managerProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const kiosks = await ctx.db.kiosk.findMany({
      where: { isActive: true },
      include: {
        operator: true,
        dispatches: {
          where: { date: today },
          include: { reconciliation: true },
        },
        bills: {
          where: { date: today },
        },
      },
      orderBy: { name: "asc" },
    });

    return kiosks.map((kiosk) => {
      const todayDispatch = kiosk.dispatches[0];
      const todayRevenue = kiosk.bills.reduce((sum, b) => sum + b.total, 0);
      const billCount = kiosk.bills.length;

      return {
        id: kiosk.id,
        name: kiosk.name,
        type: kiosk.type,
        location: kiosk.location,
        operatorName: kiosk.operator?.name || "Unassigned",
        dispatched: !!todayDispatch,
        dispatchStatus: todayDispatch?.status || null,
        reconciled: !!todayDispatch?.reconciliation,
        todayRevenue,
        billCount,
      };
    });
  }),

  getRevenueChart: managerProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(7) }))
    .query(async ({ ctx, input }) => {
      const data = [];
      for (let i = input.days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const revenue = await ctx.db.bill.aggregate({
          where: { date },
          _sum: { total: true },
        });

        data.push({
          date: date.toISOString().split("T")[0],
          revenue: revenue._sum.total || 0,
        });
      }
      return data;
    }),

  getRecentBills: managerProcedure
    .input(z.object({ limit: z.number().int().min(1).max(20).default(10) }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.bill.findMany({
        include: { kiosk: true, operator: true },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 10,
      });
    }),

  getAlerts: managerProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeKiosks = await ctx.db.kiosk.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const todayDispatches = await ctx.db.dispatch.findMany({
      where: { date: today },
      select: { kioskId: true },
    });

    const dispatchedKioskIds = new Set(todayDispatches.map((d) => d.kioskId));
    const notDispatched = activeKiosks.filter((k) => !dispatchedKioskIds.has(k.id));

    // Overdue reconciliations (dispatches from yesterday or earlier without reconciliation)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const overdueRecons = await ctx.db.dispatch.findMany({
      where: {
        date: { lt: today },
        reconciliation: null,
        status: { not: "RECONCILED" },
      },
      include: { kiosk: true },
      take: 10,
    });

    return {
      notDispatched,
      overdueRecons: overdueRecons.map((d) => ({
        dispatchId: d.id,
        kioskName: d.kiosk.name,
        date: d.date,
      })),
    };
  }),
});
