import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const aiForecastRouter = createTRPCRouter({
  getSmartPrepForecast: protectedProcedure
    .input(z.object({ kioskId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

      // 1. Get recent bills
      const where: any = {
        createdAt: { gte: sevenDaysAgo },
      };
      if (input?.kioskId) {
        where.kioskId = input.kioskId;
      }

      const recentBills = await ctx.db.bill.findMany({
        where,
        include: {
          items: {
            include: { item: true },
          },
        },
      });

      // 2. Fetch latest weather log
      const latestWeather = await ctx.db.weatherLog.findFirst({
        orderBy: { date: "desc" },
      });

      // 3. Aggregate item sales
      const itemSales: Record<
        string,
        {
          name: string;
          category: string;
          totalSold: number;
          dailyAvg: number;
        }
      > = {};

      for (const bill of recentBills) {
        for (const it of bill.items) {
          if (!itemSales[it.itemId]) {
            itemSales[it.itemId] = {
              name: it.item.name,
              category: it.item.category,
              totalSold: 0,
              dailyAvg: 0,
            };
          }
          itemSales[it.itemId].totalSold += it.quantity;
        }
      }

      // Compute 7-day daily average
      for (const id in itemSales) {
        itemSales[id].dailyAvg = Math.max(1, Math.round(itemSales[id].totalSold / 7));
      }

      // Day of week factor
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || dayOfWeek === 5;
      const dayFactor = isWeekend ? 1.25 : 0.95;

      // Weather factor
      const condition = latestWeather?.condition?.toLowerCase() || "clear";
      const temp = latestWeather?.tempHigh || 28;
      const isRainy = condition.includes("rain") || condition.includes("drizzle");
      const isCold = temp < 22;
      const isHot = temp > 33;

      const recommendations = Object.entries(itemSales).map(([itemId, stats]) => {
        let weatherFactor = 1.0;
        let reason = "Baseline 7-day sales rate";

        const lowerName = stats.name.toLowerCase();
        const isHotBeverage =
          stats.category === "BEVERAGE" && (lowerName.includes("chai") || lowerName.includes("tea") || lowerName.includes("coffee"));
        const isColdBeverage =
          stats.category === "BEVERAGE" && (lowerName.includes("cold") || lowerName.includes("shake") || lowerName.includes("lassi") || lowerName.includes("soda"));
        const isFriedSnack =
          stats.category === "FOOD" && (lowerName.includes("samosa") || lowerName.includes("kachori") || lowerName.includes("pakora"));

        if (isRainy || isCold) {
          if (isHotBeverage) {
            weatherFactor = 1.35;
            reason = isRainy ? "Rainfall surge (+35% hot beverages)" : "Cool temperature surge (+35% chai)";
          } else if (isFriedSnack) {
            weatherFactor = 1.25;
            reason = "Rainy weather snacks surge (+25%)";
          } else if (isColdBeverage) {
            weatherFactor = 0.65;
            reason = "Weather dip (-35% cold drinks)";
          }
        } else if (isHot) {
          if (isColdBeverage) {
            weatherFactor = 1.40;
            reason = "High heatwave surge (+40% cold drinks)";
          } else if (isHotBeverage) {
            weatherFactor = 0.85;
            reason = "Summer peak reduction (-15% hot tea)";
          }
        }

        const totalMultiplier = dayFactor * weatherFactor;
        const recommendedQty = Math.ceil(stats.dailyAvg * totalMultiplier);
        const changePercent = Math.round((totalMultiplier - 1) * 100);

        return {
          itemId,
          name: stats.name,
          category: stats.category,
          dailyAverage: stats.dailyAvg,
          recommendedQty,
          changePercent,
          confidence: isWeekend ? "HIGH" : "MEDIUM",
          reason: `${reason}${isWeekend ? ", weekend footfall expected" : ""}`,
        };
      });

      return {
        targetDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        weatherSnapshot: latestWeather
          ? {
              condition: latestWeather.condition,
              tempHigh: latestWeather.tempHigh,
              tempLow: latestWeather.tempLow,
              rainfall: latestWeather.rainfall,
            }
          : { condition: "Partly Cloudy", tempHigh: 30, tempLow: 22, rainfall: 0 },
        isWeekend,
        dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][(dayOfWeek + 1) % 7],
        recommendations: recommendations.sort((a, b) => b.recommendedQty - a.recommendedQty),
      };
    }),
});
