import { z } from "zod";
import { createTRPCRouter, ownerProcedure, operatorProcedure } from "../trpc";
import { calculatePerformanceScore, getLeaderboard } from "../services/performance.service";

export const performanceRouter = createTRPCRouter({
  getLeaderboard: ownerProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ input }) => {
      return getLeaderboard(input.month);
    }),

  getMyScore: operatorProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      return calculatePerformanceScore(ctx.session.user.id, input.month);
    }),

  getOperatorScore: ownerProcedure
    .input(z.object({
      operatorId: z.string(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    }))
    .query(async ({ input }) => {
      return calculatePerformanceScore(input.operatorId, input.month);
    }),
});
