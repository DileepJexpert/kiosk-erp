import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "../trpc";

export const franchiseRouter = createTRPCRouter({
  listKiosks: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.kiosk.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        location: true,
        isActive: true,
        modelType: true,
        royaltyPercent: true,
        franchiseOwnerName: true,
        franchiseOwnerPhone: true,
        franchisePayouts: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          take: 6,
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  updateAgreement: ownerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        modelType: z.enum(["COMPANY_OWNED", "FOCO", "FOFO"]),
        royaltyPercent: z.number().min(0).max(100),
        franchiseOwnerName: z.string().optional().nullable(),
        franchiseOwnerPhone: z.string().optional().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kiosk.update({
        where: { id: input.kioskId },
        data: {
          modelType: input.modelType,
          royaltyPercent: input.royaltyPercent,
          franchiseOwnerName: input.franchiseOwnerName,
          franchiseOwnerPhone: input.franchiseOwnerPhone,
        },
      });
    }),

  calculateMonthRoyalty: ownerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0, 23, 59, 59, 999);

      const kiosk = await ctx.db.kiosk.findUniqueOrThrow({
        where: { id: input.kioskId },
      });

      const bills = await ctx.db.bill.aggregate({
        where: {
          kioskId: input.kioskId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: {
          total: true,
          subtotal: true,
        },
        _count: {
          _all: true,
        },
      });

      const grossSales = bills._sum?.total || 0;
      const netSales = bills._sum?.subtotal || grossSales;
      const royaltyAmount =
        Math.round(((grossSales * kiosk.royaltyPercent) / 100) * 100) / 100;

      const payout = await ctx.db.franchisePayout.upsert({
        where: {
          kioskId_month_year: {
            kioskId: input.kioskId,
            month: input.month,
            year: input.year,
          },
        },
        update: {
          grossSales,
          netSales,
          royaltyAmount,
        },
        create: {
          kioskId: input.kioskId,
          month: input.month,
          year: input.year,
          grossSales,
          netSales,
          royaltyAmount,
          status: "PENDING",
        },
      });

      return {
        payout,
        billCount: bills._count?._all || 0,
      };
    }),

  markPaid: ownerProcedure
    .input(
      z.object({
        payoutId: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.franchisePayout.update({
        where: { id: input.payoutId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          notes: input.notes,
        },
      });
    }),
});
