import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "../trpc";

export const complianceRouter = createTRPCRouter({
  list: ownerProcedure
    .input(
      z.object({
        kioskId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.kioskId) where.kioskId = input.kioskId;

      return ctx.db.complianceDocument.findMany({
        where,
        include: { kiosk: true },
        orderBy: { expiryDate: "asc" },
      });
    }),

  create: ownerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        type: z.string().min(1),
        documentNo: z.string().min(1),
        issueDate: z.date(),
        expiryDate: z.date(),
        fileUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.complianceDocument.create({ data: input });
    }),

  update: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        documentNo: z.string().optional(),
        issueDate: z.date().optional(),
        expiryDate: z.date().optional(),
        fileUrl: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.complianceDocument.update({ where: { id }, data });
    }),

  getExpiring: ownerProcedure
    .input(z.object({ daysAhead: z.number().int().default(30) }).optional())
    .query(async ({ ctx, input }) => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + (input?.daysAhead ?? 30));

      return ctx.db.complianceDocument.findMany({
        where: {
          status: "ACTIVE",
          expiryDate: { lte: futureDate },
        },
        include: { kiosk: true },
        orderBy: { expiryDate: "asc" },
      });
    }),
});
