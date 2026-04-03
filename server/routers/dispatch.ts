import { z } from "zod";
import { createTRPCRouter, managerProcedure, operatorProcedure, protectedProcedure } from "../trpc";
import { createDispatch, getTemplateItems, bulkCreateDispatch } from "../services/dispatch.service";

export const dispatchRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        kioskId: z.string().optional(),
        status: z.enum(["PENDING", "CONFIRMED", "RECONCILED"]).optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.dispatch.findMany({
        where: {
          ...(input?.kioskId && { kioskId: input.kioskId }),
          ...(input?.status && { status: input.status }),
          ...(input?.dateFrom || input?.dateTo
            ? {
                date: {
                  ...(input?.dateFrom && { gte: input.dateFrom }),
                  ...(input?.dateTo && { lte: input.dateTo }),
                },
              }
            : {}),
        },
        include: {
          kiosk: true,
          createdBy: true,
          items: { include: { item: true } },
          reconciliation: true,
        },
        orderBy: { date: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.dispatch.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          kiosk: { include: { operator: true } },
          createdBy: true,
          items: { include: { item: true } },
          reconciliation: { include: { items: { include: { item: true } } } },
        },
      });
    }),

  create: managerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        date: z.date(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createDispatch(
        input.kioskId,
        input.date,
        ctx.session.user.id,
        input.items,
        input.notes
      );
    }),

  confirm: operatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const dispatch = await ctx.db.dispatch.findUniqueOrThrow({
        where: { id: input.id },
        include: { kiosk: true },
      });

      if (dispatch.status !== "PENDING") {
        throw new Error("Dispatch is not in PENDING status");
      }

      return ctx.db.dispatch.update({
        where: { id: input.id },
        data: { status: "CONFIRMED" },
      });
    }),

  getUnreconciled: protectedProcedure
    .input(z.object({ kioskId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const where: any = {
        status: { in: ["PENDING", "CONFIRMED"] },
        reconciliation: null,
      };

      if (role === "OPERATOR") {
        const kiosk = await ctx.db.kiosk.findFirst({
          where: { operatorId: ctx.session.user.id },
        });
        if (kiosk) where.kioskId = kiosk.id;
      } else if (input?.kioskId) {
        where.kioskId = input.kioskId;
      }

      return ctx.db.dispatch.findMany({
        where,
        include: {
          kiosk: true,
          items: { include: { item: true } },
        },
        orderBy: { date: "desc" },
      });
    }),

  getTemplateItems: managerProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ input }) => {
      return getTemplateItems(input.kioskId);
    }),

  bulkCreate: managerProcedure
    .input(
      z.object({
        kioskIds: z.array(z.string()),
        date: z.date(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return bulkCreateDispatch(input.kioskIds, input.date, ctx.session.user.id, input.notes);
    }),
});
