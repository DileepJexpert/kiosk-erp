import { z } from "zod";
import { createTRPCRouter, operatorProcedure, ownerProcedure } from "../trpc";

export const wasteRouter = createTRPCRouter({
  logWaste: operatorProcedure
    .input(
      z.object({
        kioskId: z.string(),
        itemId: z.string(),
        quantity: z.number().positive(),
        reason: z.enum([
          "CURDLED_MILK",
          "BURNT_PREP",
          "DROPPED_DAMAGED",
          "EXPIRED_SHELF_LIFE",
          "PEST_DAMAGE",
        ]),
        photoUrl: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.item.findUniqueOrThrow({
        where: { id: input.itemId },
      });

      const costLoss = Math.round(input.quantity * item.costPrice * 100) / 100;

      return ctx.db.wasteAuditLog.create({
        data: {
          kioskId: input.kioskId,
          itemId: input.itemId,
          quantity: input.quantity,
          reason: input.reason,
          costLoss,
          photoUrl: input.photoUrl,
          notes: input.notes,
          loggedById: ctx.session.user.id,
        },
        include: {
          item: true,
          kiosk: true,
          loggedBy: true,
        },
      });
    }),

  listLogs: ownerProcedure
    .input(
      z
        .object({
          kioskId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.kioskId) where.kioskId = input.kioskId;
      if (input?.startDate || input?.endDate) {
        where.createdAt = {
          ...(input?.startDate && { gte: input.startDate }),
          ...(input?.endDate && { lte: input.endDate }),
        };
      }

      const logs = await ctx.db.wasteAuditLog.findMany({
        where,
        include: {
          item: true,
          kiosk: true,
          loggedBy: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const totalLossAmount = logs.reduce((sum, l) => sum + l.costLoss, 0);

      return {
        logs,
        totalLossAmount,
        totalIncidents: logs.length,
      };
    }),
});
