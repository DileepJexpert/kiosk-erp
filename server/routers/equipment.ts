import { z } from "zod";
import { createTRPCRouter, protectedProcedure, ownerProcedure } from "../trpc";

export const equipmentRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ kioskId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where = input?.kioskId ? { kioskId: input.kioskId } : {};

      const items = await ctx.db.equipment.findMany({
        where,
        include: {
          kiosk: { select: { id: true, name: true, location: true } },
          logs: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      });

      const now = new Date();
      return items.map((item) => {
        const isWarrantyExpired = item.warrantyExpiry
          ? item.warrantyExpiry < now
          : null;
        const isAmcExpired = item.amcExpiry ? item.amcExpiry < now : null;

        const amcDaysRemaining = item.amcExpiry
          ? Math.ceil(
              (item.amcExpiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )
          : null;

        return {
          ...item,
          isWarrantyExpired,
          isAmcExpired,
          amcDaysRemaining,
        };
      });
    }),

  create: ownerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        name: z.string().min(1, "Name required"),
        brand: z.string().optional(),
        serialNumber: z.string().optional(),
        purchaseDate: z.string().optional(),
        warrantyExpiry: z.string().optional(),
        amcExpiry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.equipment.create({
        data: {
          kioskId: input.kioskId,
          name: input.name,
          brand: input.brand,
          serialNumber: input.serialNumber,
          purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
          warrantyExpiry: input.warrantyExpiry
            ? new Date(input.warrantyExpiry)
            : null,
          amcExpiry: input.amcExpiry ? new Date(input.amcExpiry) : null,
          status: "OPERATIONAL",
        },
      });
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["OPERATIONAL", "NEEDS_REPAIR", "IN_SERVICE"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.equipment.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),

  logMaintenance: protectedProcedure
    .input(
      z.object({
        equipmentId: z.string(),
        issue: z.string().min(1, "Issue required"),
        cost: z.number().min(0).default(0),
        technician: z.string().optional(),
        markUnderRepair: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.markUnderRepair) {
        await ctx.db.equipment.update({
          where: { id: input.equipmentId },
          data: { status: "NEEDS_REPAIR" },
        });
      }

      return ctx.db.maintenanceLog.create({
        data: {
          equipmentId: input.equipmentId,
          issue: input.issue,
          cost: input.cost,
          technician: input.technician,
          status: "OPEN",
        },
      });
    }),

  resolveMaintenance: protectedProcedure
    .input(
      z.object({
        logId: z.string(),
        cost: z.number().min(0),
        technician: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await ctx.db.maintenanceLog.update({
        where: { id: input.logId },
        data: {
          status: "RESOLVED",
          cost: input.cost,
          technician: input.technician,
          resolvedAt: new Date(),
        },
      });

      // Reset equipment back to OPERATIONAL
      await ctx.db.equipment.update({
        where: { id: log.equipmentId },
        data: { status: "OPERATIONAL" },
      });

      return log;
    }),
});
