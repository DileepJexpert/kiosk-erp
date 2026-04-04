import { z } from "zod";
import { createTRPCRouter, operatorProcedure, ownerProcedure } from "../trpc";

const POINTS_PER_10_RUPEES = 1; // 1 point per ₹10 spent
const POINTS_TO_RUPEE = 0.25; // 4 points = ₹1 discount

export const customerRouter = createTRPCRouter({
  findByPhone: operatorProcedure
    .input(z.object({ phone: z.string().length(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.customer.findUnique({
        where: { phone: input.phone },
      });
    }),

  create: operatorProcedure
    .input(
      z.object({
        phone: z.string().length(10),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.customer.upsert({
        where: { phone: input.phone },
        create: { phone: input.phone, name: input.name },
        update: { name: input.name || undefined },
      });
    }),

  addPoints: operatorProcedure
    .input(
      z.object({
        customerId: z.string(),
        billAmount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pointsEarned = Math.floor(input.billAmount / 10); // 1 point per ₹10
      return ctx.db.customer.update({
        where: { id: input.customerId },
        data: {
          loyaltyPts: { increment: pointsEarned },
          totalSpend: { increment: input.billAmount },
          totalVisits: { increment: 1 },
          lastVisitAt: new Date(),
        },
      });
    }),

  redeemPoints: operatorProcedure
    .input(
      z.object({
        customerId: z.string(),
        points: z.number().int().positive(),
        billId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUniqueOrThrow({
        where: { id: input.customerId },
      });

      if (customer.loyaltyPts < input.points) {
        throw new Error("Insufficient points");
      }

      const discountAmt = input.points * POINTS_TO_RUPEE;

      await ctx.db.customer.update({
        where: { id: input.customerId },
        data: { loyaltyPts: { decrement: input.points } },
      });

      await ctx.db.loyaltyRedemption.create({
        data: {
          customerId: input.customerId,
          pointsUsed: input.points,
          discountAmt,
          billId: input.billId,
        },
      });

      return { discountAmt, remainingPoints: customer.loyaltyPts - input.points };
    }),

  list: ownerProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.search) {
        where.OR = [
          { phone: { contains: input.search } },
          { name: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return ctx.db.customer.findMany({
        where,
        orderBy: { totalSpend: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  getStats: ownerProcedure.query(async ({ ctx }) => {
    const totalCustomers = await ctx.db.customer.count();
    const repeatCustomers = await ctx.db.customer.count({
      where: { totalVisits: { gte: 3 } },
    });
    const agg = await ctx.db.customer.aggregate({
      _sum: { totalSpend: true },
    });

    return {
      totalCustomers,
      repeatCustomers,
      repeatRate: totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : "0",
      totalSpend: agg._sum.totalSpend || 0,
    };
  }),
});
