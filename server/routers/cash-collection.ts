import { z } from "zod";
import { createTRPCRouter, operatorProcedure, ownerProcedure } from "../trpc";
import {
  recordCollection,
  verifyCollection,
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
        collectedCash: z.number().min(0),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recordCollection(
        input.kioskId,
        ctx.session.user.id,
        input.date,
        input.collectedCash,
        input.notes
      );
    }),

  verify: ownerProcedure
    .input(z.object({ collectionId: z.string() }))
    .mutation(async ({ input }) => {
      return verifyCollection(input.collectionId);
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
