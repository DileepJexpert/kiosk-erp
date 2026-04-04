import { z } from "zod";
import { createTRPCRouter, operatorProcedure, ownerProcedure } from "../trpc";
import { createExpense, approveExpense, getExpenseSummary } from "../services/expense.service";

export const expenseRouter = createTRPCRouter({
  create: operatorProcedure
    .input(
      z.object({
        kioskId: z.string(),
        date: z.date(),
        amount: z.number().positive(),
        category: z.enum(["GAS", "TRANSPORT", "CLEANING", "REPAIR", "SUPPLIES", "OTHER"]),
        description: z.string().min(1),
        receiptUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createExpense(
        ctx.session.user.id,
        input.kioskId,
        input.date,
        input.amount,
        input.category,
        input.description,
        input.receiptUrl
      );
    }),

  approve: ownerProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ input }) => {
      return approveExpense(input.expenseId);
    }),

  list: ownerProcedure
    .input(
      z.object({
        kioskId: z.string().optional(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      return getExpenseSummary(input.kioskId, input.startDate, input.endDate);
    }),

  myExpenses: operatorProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.expense.findMany({
        where: {
          operatorId: ctx.session.user.id,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { kiosk: true },
        orderBy: { date: "desc" },
      });
    }),
});
