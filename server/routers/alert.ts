import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "../trpc";

export const alertRouter = createTRPCRouter({
  list: ownerProcedure
    .input(
      z.object({
        kioskId: z.string().optional(),
        severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
        unreadOnly: z.boolean().default(false),
        limit: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.kioskId) where.kioskId = input.kioskId;
      if (input?.severity) where.severity = input.severity;
      if (input?.unreadOnly) where.isRead = false;

      return ctx.db.alert.findMany({
        where,
        include: { kiosk: true },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  markRead: ownerProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.alert.update({
        where: { id: input.alertId },
        data: { isRead: true },
      });
    }),

  markAllRead: ownerProcedure
    .mutation(async ({ ctx }) => {
      return ctx.db.alert.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
    }),

  unreadCount: ownerProcedure
    .query(async ({ ctx }) => {
      return ctx.db.alert.count({ where: { isRead: false } });
    }),

  // Fraud detection: create alerts for anomalies
  runFraudCheck: ownerProcedure
    .input(z.object({ date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      const alerts: any[] = [];
      const kiosks = await ctx.db.kiosk.findMany({
        where: { isActive: true },
        include: { operator: true },
      });

      for (const kiosk of kiosks) {
        // Check 1: Cash shortage > ₹500
        const cashCollection = await ctx.db.cashCollection.findUnique({
          where: { kioskId_date: { kioskId: kiosk.id, date: input.date } },
        });
        if (cashCollection && cashCollection.difference < -500) {
          alerts.push({
            type: "CASH_SHORTAGE",
            severity: cashCollection.difference < -1000 ? "CRITICAL" : "HIGH",
            message: `Cash shortage of ₹${Math.abs(cashCollection.difference)} at ${kiosk.name}`,
            data: { kioskId: kiosk.id, amount: cashCollection.difference },
            kioskId: kiosk.id,
          });
        }

        // Check 2: Revenue anomaly — compare with 7-day average
        const sevenDaysAgo = new Date(input.date);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const recentBills = await ctx.db.bill.findMany({
          where: {
            kioskId: kiosk.id,
            date: { gte: sevenDaysAgo, lt: input.date },
          },
        });

        const todayBills = await ctx.db.bill.findMany({
          where: { kioskId: kiosk.id, date: input.date },
        });

        if (recentBills.length > 0) {
          const avgRevenue = recentBills.reduce((s, b) => s + b.total, 0) / 7;
          const todayRevenue = todayBills.reduce((s, b) => s + b.total, 0);

          if (avgRevenue > 0 && todayRevenue < avgRevenue * 0.4) {
            alerts.push({
              type: "LOW_REVENUE",
              severity: "HIGH",
              message: `Revenue at ${kiosk.name} is ${Math.round((todayRevenue / avgRevenue) * 100)}% of 7-day average`,
              data: { kioskId: kiosk.id, todayRevenue, avgRevenue },
              kioskId: kiosk.id,
            });
          }
        }

        // Check 3: High wastage
        const recon = await ctx.db.reconciliation.findFirst({
          where: { kioskId: kiosk.id, date: input.date },
        });
        if (recon && recon.totalLoss > 1000) {
          alerts.push({
            type: "HIGH_WASTAGE",
            severity: recon.totalLoss > 3000 ? "CRITICAL" : "HIGH",
            message: `High loss of ₹${recon.totalLoss} at ${kiosk.name}`,
            data: { kioskId: kiosk.id, loss: recon.totalLoss },
            kioskId: kiosk.id,
          });
        }
      }

      // Bulk create alerts
      if (alerts.length > 0) {
        await ctx.db.alert.createMany({ data: alerts });
      }

      return { alertsCreated: alerts.length };
    }),
});
