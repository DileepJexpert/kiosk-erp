import { z } from "zod";
import { createTRPCRouter, ownerProcedure, publicProcedure } from "../trpc";

export const dynamicPricingRouter = createTRPCRouter({
  listRules: ownerProcedure
    .input(z.object({ kioskId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.kioskId) where.kioskId = input.kioskId;
      return ctx.db.dynamicPricingRule.findMany({
        where,
        include: { kiosk: true },
        orderBy: { createdAt: "desc" },
      });
    }),

  createRule: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        ruleType: z.enum(["HAPPY_HOUR", "RAIN_SURGE", "WEEKEND_PEAK"]),
        kioskId: z.string().optional(),
        discountPercent: z.number(), // positive for discount, negative for surge
        startTime: z.string().optional(), // "15:00"
        endTime: z.string().optional(),   // "17:00"
        daysOfWeek: z.string().optional(), // "1,2,3,4,5"
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dynamicPricingRule.create({
        data: input,
      });
    }),

  toggleRule: ownerProcedure
    .input(z.object({ id: z.string(), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dynamicPricingRule.update({
        where: { id: input.id },
        data: { isActive: input.isActive },
      });
    }),

  deleteRule: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.dynamicPricingRule.delete({
        where: { id: input.id },
      });
    }),

  getActiveRules: publicProcedure
    .input(z.object({ kioskId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const currentDay = String(now.getDay()); // 0-6
      const currentHour = now.getHours();
      const currentMin = now.getMinutes();
      const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

      const allActive = await ctx.db.dynamicPricingRule.findMany({
        where: {
          isActive: true,
          OR: [
            { kioskId: null },
            ...(input?.kioskId ? [{ kioskId: input.kioskId }] : []),
          ],
        },
      });

      // Filter in-memory for time window and day of week
      return allActive.filter((rule) => {
        if (rule.daysOfWeek && !rule.daysOfWeek.split(",").includes(currentDay)) {
          return false;
        }
        if (rule.startTime && rule.endTime) {
          if (currentTimeStr < rule.startTime || currentTimeStr > rule.endTime) {
            return false;
          }
        }
        return true;
      });
    }),
});
