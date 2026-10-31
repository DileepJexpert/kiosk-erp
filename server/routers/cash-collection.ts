import { z } from "zod";
import { createTRPCRouter, operatorProcedure, ownerProcedure } from "../trpc";
import {
  recordCollection,
  recordBlindCashDrop,
  markDeposited,
  getCollectionSummary,
  calculateExpectedCash,
} from "../services/cash-collection.service";

export const cashCollectionRouter = createTRPCRouter({
  recordBlindDrop: operatorProcedure
    .input(
      z.object({
        kioskId: z.string(),
        date: z.date(),
        denominations: z.object({
          c500: z.number().int().min(0).default(0),
          c200: z.number().int().min(0).default(0),
          c100: z.number().int().min(0).default(0),
          c50: z.number().int().min(0).default(0),
          c20: z.number().int().min(0).default(0),
          c10: z.number().int().min(0).default(0),
          coins: z.number().min(0).default(0),
        }),
        shortageReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const drop = await recordBlindCashDrop(
        input.kioskId,
        ctx.session.user.id,
        input.date,
        input.denominations,
        input.shortageReason
      );
      return {
        id: drop.id,
        actualCash: drop.actualCash,
        date: drop.date,
        message: "Blind cash drop submitted successfully to management audit.",
      };
    }),

  getExpectedCash: operatorProcedure
    .input(z.object({ kioskId: z.string(), date: z.date() }))
    .query(async ({ input }) => {
      return calculateExpectedCash(input.kioskId, input.date);
    }),

  record: operatorProcedure
    .input(
      z.object({
        kioskId: z.string(),
        date: z.date(),
        actualCash: z.number().min(0),
        shortageReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recordCollection(
        input.kioskId,
        ctx.session.user.id,
        input.date,
        input.actualCash,
        input.shortageReason
      );
    }),

  markDeposited: ownerProcedure
    .input(z.object({ collectionId: z.string(), bankDepositRef: z.string() }))
    .mutation(async ({ input }) => {
      return markDeposited(input.collectionId, input.bankDepositRef);
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
      return getCollectionSummary(input.kioskId, input.startDate, input.endDate);
    }),

  getByDate: operatorProcedure
    .input(z.object({ kioskId: z.string(), date: z.date() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.cashCollection.findUnique({
        where: { kioskId_date: { kioskId: input.kioskId, date: input.date } },
      });
    }),
});
