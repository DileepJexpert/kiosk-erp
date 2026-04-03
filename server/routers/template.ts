import { z } from "zod";
import { createTRPCRouter, ownerProcedure, managerProcedure } from "../trpc";

export const templateRouter = createTRPCRouter({
  list: managerProcedure
    .input(
      z.object({
        kioskType: z.string().optional(),
        seasonId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.menuTemplate.findMany({
        where: {
          ...(input?.kioskType && { kioskType: input.kioskType }),
          ...(input?.seasonId && { seasonId: input.seasonId }),
        },
        include: {
          season: true,
          items: { include: { item: true } },
          activeKiosks: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  create: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        kioskType: z.string().min(1),
        seasonId: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            defaultQty: z.number().int().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { items, ...data } = input;
      return ctx.db.menuTemplate.create({
        data: {
          ...data,
          items: {
            create: items,
          },
        },
        include: { items: { include: { item: true } }, season: true },
      });
    }),

  update: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        kioskType: z.string().min(1).optional(),
        seasonId: z.string().nullable().optional(),
        items: z
          .array(
            z.object({
              itemId: z.string(),
              defaultQty: z.number().int().positive(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, items, ...data } = input;

      if (items) {
        // Replace all template items
        await ctx.db.menuTemplateItem.deleteMany({ where: { templateId: id } });
        await ctx.db.menuTemplateItem.createMany({
          data: items.map((item) => ({ ...item, templateId: id })),
        });
      }

      return ctx.db.menuTemplate.update({
        where: { id },
        data,
        include: { items: { include: { item: true } }, season: true },
      });
    }),

  switchSeason: ownerProcedure
    .input(
      z.object({
        kioskType: z.string().optional(),
        templateId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const where: any = {};
      if (input.kioskType) where.type = input.kioskType;

      return ctx.db.kiosk.updateMany({
        where,
        data: { activeTemplateId: input.templateId },
      });
    }),

  listSeasons: managerProcedure.query(async ({ ctx }) => {
    return ctx.db.season.findMany({
      include: { templates: true },
      orderBy: { startDate: "desc" },
    });
  }),

  createSeason: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["WINTER", "SUMMER", "MONSOON", "FESTIVAL", "ALL_YEAR"]),
        startDate: z.date(),
        endDate: z.date(),
        isActive: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.season.create({ data: input });
    }),
});
