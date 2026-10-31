import { z } from "zod";
import { createTRPCRouter, operatorProcedure, publicProcedure } from "../trpc";
import {
  calculateLoyaltyStampProgression,
  generateWhatsAppPassbookMessage,
} from "../services/loyalty.service";

export const loyaltyRouter = createTRPCRouter({
  getStampCard: publicProcedure
    .input(z.object({ phone: z.string() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUnique({
        where: { phone: input.phone },
      });

      if (!customer) {
        return {
          exists: false,
          phone: input.phone,
          stampsCount: 0,
          targetStamps: 5,
          freeChaisAvailable: 0,
          totalVisits: 0,
          totalSpend: 0,
        };
      }

      return {
        exists: true,
        id: customer.id,
        phone: customer.phone,
        name: customer.name,
        stampsCount: customer.stampsCount,
        targetStamps: 5,
        freeChaisAvailable: customer.freeChaisAvailable,
        totalVisits: customer.totalVisits,
        totalSpend: customer.totalSpend,
      };
    }),

  recordStamp: operatorProcedure
    .input(z.object({ phone: z.string(), name: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      let customer = await ctx.db.customer.findUnique({
        where: { phone: input.phone },
      });

      if (!customer) {
        customer = await ctx.db.customer.create({
          data: {
            phone: input.phone,
            name: input.name,
            totalVisits: 1,
            stampsCount: 1,
            freeChaisAvailable: 0,
          },
        });
      } else {
        const { newStamps, extraReward } = calculateLoyaltyStampProgression(customer.stampsCount, 5);

        customer = await ctx.db.customer.update({
          where: { id: customer.id },
          data: {
            totalVisits: customer.totalVisits + 1,
            stampsCount: newStamps,
            freeChaisAvailable: customer.freeChaisAvailable + extraReward,
            lastVisitAt: new Date(),
          },
        });
      }

      return {
        customer,
        justEarnedReward: customer.freeChaisAvailable > 0,
      };
    }),

  redeemReward: operatorProcedure
    .input(z.object({ phone: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUniqueOrThrow({
        where: { phone: input.phone },
      });

      if (customer.freeChaisAvailable <= 0) {
        throw new Error("No free reward chais available to redeem");
      }

      return ctx.db.customer.update({
        where: { id: customer.id },
        data: {
          freeChaisAvailable: customer.freeChaisAvailable - 1,
        },
      });
    }),

  getWhatsAppShareLink: publicProcedure
    .input(z.object({ phone: z.string(), kioskName: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const customer = await ctx.db.customer.findUnique({
        where: { phone: input.phone },
      });

      const stamps = customer?.stampsCount || 0;
      const freeCount = customer?.freeChaisAvailable || 0;

      const { message, url } = generateWhatsAppPassbookMessage({
        kioskName: input.kioskName,
        phone: input.phone,
        stampsCount: stamps,
        freeChaisAvailable: freeCount,
      });

      return {
        whatsappLink: url,
        message,
      };
    }),
});
