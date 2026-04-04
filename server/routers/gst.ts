import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "../trpc";
import { getMonthlyGSTSummary, getHSNWiseSummary, generateGSTR1 } from "../services/gst.service";

export const gstRouter = createTRPCRouter({
  getMonthlySummary: ownerProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      kioskId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getMonthlyGSTSummary(input.month, input.kioskId);
    }),

  getHSNSummary: ownerProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      kioskId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return getHSNWiseSummary(input.month, input.kioskId);
    }),

  getGSTR1: ownerProcedure
    .input(z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      kioskId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return generateGSTR1(input.month, input.kioskId);
    }),
});
