import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  ownerProcedure,
  managerProcedure,
  operatorProcedure,
  publicProcedure,
} from "../trpc";

export const kioskRouter = createTRPCRouter({
  getPublicMenu: publicProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const kiosk = await ctx.db.kiosk.findUnique({
        where: { id: input.kioskId },
        include: {
          activeTemplate: {
            include: { items: { include: { item: true } } },
          },
        },
      });

      if (!kiosk) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kiosk not found" });
      }

      let rawItems;
      if (kiosk.activeTemplate && kiosk.activeTemplate.items.length > 0) {
        rawItems = kiosk.activeTemplate.items
          .filter((ti) => ti.item.isActive && ti.item.sellPrice > 0)
          .map((ti) => ti.item);
      } else {
        rawItems = await ctx.db.item.findMany({
          where: { isActive: true, sellPrice: { gt: 0 } },
          orderBy: { name: "asc" },
        });
      }

      // Check Auto-86 item availabilities for this kiosk
      const availabilities = await ctx.db.kioskItemAvailability.findMany({
        where: { kioskId: input.kioskId },
      });
      const availMap = new Map(availabilities.map((a) => [a.itemId, a.isAvailable]));

      const items = rawItems.map((it) => {
        const isAvailable = availMap.has(it.id) ? availMap.get(it.id)! : true;
        return {
          ...it,
          isAvailable,
          is86ed: !isAvailable,
        };
      });

      return {
        id: kiosk.id,
        name: kiosk.name,
        location: kiosk.location,
        upiId: kiosk.upiId || "kiosk.business@upi",
        items,
      };
    }),

  toggle86Item: operatorProcedure
    .input(
      z.object({
        kioskId: z.string(),
        itemId: z.string(),
        isAvailable: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kioskItemAvailability.upsert({
        where: {
          kioskId_itemId: {
            kioskId: input.kioskId,
            itemId: input.itemId,
          },
        },
        create: {
          kioskId: input.kioskId,
          itemId: input.itemId,
          isAvailable: input.isAvailable,
          reason: input.reason,
        },
        update: {
          isAvailable: input.isAvailable,
          reason: input.reason,
        },
      });
    }),

  getItemAvailabilities: operatorProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.kioskItemAvailability.findMany({
        where: { kioskId: input.kioskId },
      });
    }),

  list: managerProcedure.query(async ({ ctx }) => {
    return ctx.db.kiosk.findMany({
      include: { operator: true, manager: true, activeTemplate: true },
      orderBy: { name: "asc" },
    });
  }),

  getById: managerProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.kiosk.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          operator: true,
          manager: true,
          activeTemplate: { include: { items: { include: { item: true } } } },
        },
      });
    }),

  create: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1),
        location: z.string().min(1),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kiosk.create({ data: input });
    }),

  update: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        type: z.string().min(1).optional(),
        location: z.string().min(1).optional(),
        address: z.string().optional(),
        operatorId: z.string().nullable().optional(),
        managerId: z.string().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.kiosk.update({ where: { id }, data });
    }),

  toggleActive: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const kiosk = await ctx.db.kiosk.findUniqueOrThrow({ where: { id: input.id } });
      return ctx.db.kiosk.update({
        where: { id: input.id },
        data: { isActive: !kiosk.isActive },
      });
    }),

  assignTemplate: managerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        templateId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kiosk.update({
        where: { id: input.kioskId },
        data: { activeTemplateId: input.templateId },
      });
    }),
});
