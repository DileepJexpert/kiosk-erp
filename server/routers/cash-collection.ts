import { z } from "zod";
import { createTRPCRouter, operatorProcedure, ownerProcedure } from "../trpc";
import {
  recordCollection,
  markDeposited,
  getCollectionSummary,
  calculateExpectedCash,
} from "../services/cash-collection.service";

export const cashCollectionRouter = createTRPCRouter({
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
