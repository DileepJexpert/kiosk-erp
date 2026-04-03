import { z } from "zod";
import { createTRPCRouter, operatorProcedure, managerProcedure, ownerProcedure, protectedProcedure } from "../trpc";
import { processReconciliation, crossValidateWithBills } from "../services/reconciliation.service";

export const reconciliationRouter = createTRPCRouter({
  create: operatorProcedure
    .input(
      z.object({
        dispatchId: z.string(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            dispatched: z.number().int().min(0),
            sold: z.number().int().min(0),
            returned: z.number().int().min(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await processReconciliation(
        input.dispatchId,
        ctx.session.user.id,
        input.items,
        input.notes
      );

      // Cross-validate with bills (non-blocking warning)
      const warnings = await crossValidateWithBills(
        result.kioskId,
        result.date,
        result.items.map((item) => ({
          itemId: item.itemId,
          dispatched: item.dispatched,
          sold: item.sold,
          returned: item.returned,
          wasted: item.wasted,
          allowedMargin: item.allowedMargin,
          chargeableLoss: item.chargeableLoss,
          lossAmount: item.lossAmount,
        }))
      );

      return { reconciliation: result, warnings };
    }),

  list: managerProcedure
    .input(
      z.object({
        kioskId: z.string().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.reconciliation.findMany({
        where: {
          ...(input?.kioskId && { kioskId: input.kioskId }),
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
          dispatch: true,
          kiosk: true,
          operator: true,
          items: { include: { item: true } },
        },
        orderBy: { date: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.reconciliation.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          dispatch: { include: { items: { include: { item: true } } } },
          kiosk: true,
          operator: true,
          items: { include: { item: true } },
        },
      });
    }),

  void: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const recon = await ctx.db.reconciliation.findUniqueOrThrow({
        where: { id: input.id },
      });

      return ctx.db.$transaction(async (tx) => {
        // Delete reconciliation
        await tx.reconciliation.delete({ where: { id: input.id } });

        // Reset dispatch status to CONFIRMED
        await tx.dispatch.update({
          where: { id: recon.dispatchId },
          data: { status: "CONFIRMED" },
        });

        return { success: true };
      });
    }),
});
