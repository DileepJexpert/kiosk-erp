import { z } from "zod";
import { createTRPCRouter, ownerProcedure, managerProcedure, operatorProcedure } from "../trpc";

export const itemRouter = createTRPCRouter({
  list: managerProcedure
    .input(z.object({
      category: z.enum(["FOOD", "BEVERAGE", "SUPPLY", "PACKAGING"]).optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.item.findMany({
        where: {
          ...(input?.category && { category: input.category }),
          ...(input?.isActive !== undefined && { isActive: input.isActive }),
        },
        include: { variants: true },
        orderBy: { name: "asc" },
      });
    }),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      unit: z.string().min(1),
      costPrice: z.number().min(0),
      sellPrice: z.number().min(0).default(0),
      category: z.enum(["FOOD", "BEVERAGE", "SUPPLY", "PACKAGING"]),
      dailyMargin: z.number().int().min(0).default(0),
      seasonTags: z.array(z.enum(["WINTER", "SUMMER", "MONSOON", "FESTIVAL", "ALL_YEAR"])).default(["ALL_YEAR"]),
      isPerishable: z.boolean().default(false),
      shelfLifeHrs: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.item.create({ data: input });
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      unit: z.string().min(1).optional(),
      costPrice: z.number().min(0).optional(),
      sellPrice: z.number().min(0).optional(),
      category: z.enum(["FOOD", "BEVERAGE", "SUPPLY", "PACKAGING"]).optional(),
      dailyMargin: z.number().int().min(0).optional(),
      seasonTags: z.array(z.enum(["WINTER", "SUMMER", "MONSOON", "FESTIVAL", "ALL_YEAR"])).optional(),
      isPerishable: z.boolean().optional(),
      shelfLifeHrs: z.number().int().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.item.update({ where: { id }, data });
    }),

  addVariant: ownerProcedure
    .input(z.object({
      itemId: z.string(),
      name: z.string().min(1),
      costPrice: z.number().min(0),
      sellPrice: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.itemVariant.create({ data: input });
    }),

  updateVariant: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      costPrice: z.number().min(0).optional(),
      sellPrice: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.itemVariant.update({ where: { id }, data });
    }),

  deleteVariant: ownerProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.itemVariant.delete({ where: { id: input.id } });
    }),

  listSellable: operatorProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const kiosk = await ctx.db.kiosk.findFirst({
      where: { operatorId: userId },
      include: {
        activeTemplate: {
          include: { items: { include: { item: true } } },
        },
      },
    });

    if (!kiosk?.activeTemplate) {
      return ctx.db.item.findMany({
        where: { isActive: true, sellPrice: { gt: 0 } },
        orderBy: { name: "asc" },
      });
    }

    const templateItemIds = kiosk.activeTemplate.items.map((ti) => ti.itemId);
    return ctx.db.item.findMany({
      where: {
        id: { in: templateItemIds },
        isActive: true,
        sellPrice: { gt: 0 },
      },
      orderBy: { name: "asc" },
    });
  }),
});
