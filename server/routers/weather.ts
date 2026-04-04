import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "../trpc";
import { logWeatherForKiosks, getWeatherForDate } from "../services/weather.service";

export const weatherRouter = createTRPCRouter({
  fetchAndLog: ownerProcedure
    .input(z.object({ date: z.date() }))
    .mutation(async ({ input }) => {
      const logged = await logWeatherForKiosks(input.date);
      return { logged };
    }),

  getForKiosk: ownerProcedure
    .input(z.object({ kioskId: z.string(), date: z.date() }))
    .query(async ({ input }) => {
      return getWeatherForDate(input.kioskId, input.date);
    }),

  getRecent: ownerProcedure
    .input(z.object({ kioskId: z.string(), days: z.number().int().default(7) }))
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      return ctx.db.weatherLog.findMany({
        where: { kioskId: input.kioskId, date: { gte: startDate } },
        orderBy: { date: "desc" },
      });
    }),
});
