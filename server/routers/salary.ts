import { z } from "zod";
import { createTRPCRouter, ownerProcedure, operatorProcedure } from "../trpc";
import { generateMonthlySalary, generateAllSalaries } from "../services/salary.service";

export const salaryRouter = createTRPCRouter({
  generate: ownerProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
        baseSalary: z.number().positive().default(12000),
      })
    )
    .mutation(async ({ input }) => {
      return generateAllSalaries(input.month, input.baseSalary);
    }),

  list: ownerProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.salaryRecord.findMany({
        where: { month: input.month },
        include: { operator: { include: { assignedKiosk: true } } },
        orderBy: { operator: { name: "asc" } },
      });
    }),

  getOperatorSalary: operatorProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const month = input?.month || getCurrentMonth();
      return ctx.db.salaryRecord.findUnique({
        where: {
          operatorId_month: {
            operatorId: ctx.session.user.id,
            month,
          },
        },
      });
    }),

  finalize: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.salaryRecord.update({
        where: { id: input.id },
        data: { status: "FINALIZED" },
      });
    }),

  markPaid: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.salaryRecord.update({
        where: { id: input.id },
        data: { status: "PAID", paidAt: new Date() },
      });
    }),

  addAdvance: ownerProcedure
    .input(
      z.object({
        operatorId: z.string(),
        amount: z.number().positive(),
        date: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.advance.create({ data: input });
    }),

  listAdvances: ownerProcedure
    .input(
      z.object({
        operatorId: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: any = { operatorId: input.operatorId };
      if (input.month) {
        const [year, m] = input.month.split("-").map(Number);
        where.date = {
          gte: new Date(year, m - 1, 1),
          lte: new Date(year, m, 0),
        };
      }
      return ctx.db.advance.findMany({
        where,
        orderBy: { date: "desc" },
      });
    }),
});

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
