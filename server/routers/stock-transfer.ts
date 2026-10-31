import { z } from "zod";
import { createTRPCRouter, operatorProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const stockTransferRouter = createTRPCRouter({
  createRequest: operatorProcedure
    .input(
      z.object({
        targetKioskId: z.string(), // Kiosk requesting the stock
        sourceKioskId: z.string(), // Kiosk providing the stock
        itemId: z.string(),
        quantity: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.targetKioskId === input.sourceKioskId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Source and target kiosk cannot be the same",
        });
      }

      // Generate a 6-character code
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const transferCode = `TRF-${randomPart}`;

      return ctx.db.stockTransfer.create({
        data: {
          transferCode,
          targetKioskId: input.targetKioskId,
          sourceKioskId: input.sourceKioskId,
          itemId: input.itemId,
          quantity: input.quantity,
          status: "PENDING",
        },
        include: {
          item: true,
          sourceKiosk: true,
          targetKiosk: true,
        },
      });
    }),

  listKioskTransfers: operatorProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const incoming = await ctx.db.stockTransfer.findMany({
        where: { targetKioskId: input.kioskId },
        include: { item: true, sourceKiosk: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const outgoing = await ctx.db.stockTransfer.findMany({
        where: { sourceKioskId: input.kioskId },
        include: { item: true, targetKiosk: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return {
        incoming, // Requested by this kiosk
        outgoing, // Requested FROM this kiosk
      };
    }),

  acceptTransfer: operatorProcedure
    .input(z.object({ transferCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transfer = await ctx.db.stockTransfer.findUnique({
        where: { transferCode: input.transferCode.trim().toUpperCase() },
        include: { item: true, sourceKiosk: true, targetKiosk: true },
      });

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer code not found",
        });
      }

      if (transfer.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transfer is already ${transfer.status}`,
        });
      }

      return ctx.db.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "ACCEPTED",
          completedAt: new Date(),
        },
        include: {
          item: true,
          sourceKiosk: true,
          targetKiosk: true,
        },
      });
    }),

  rejectTransfer: operatorProcedure
    .input(z.object({ transferCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const transfer = await ctx.db.stockTransfer.findUnique({
        where: { transferCode: input.transferCode.trim().toUpperCase() },
      });

      if (!transfer) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transfer code not found",
        });
      }

      return ctx.db.stockTransfer.update({
        where: { id: transfer.id },
        data: {
          status: "REJECTED",
        },
      });
    }),
});
