import { z } from "zod";
import { createTRPCRouter, ownerProcedure, managerProcedure } from "../trpc";

export const kioskRouter = createTRPCRouter({
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
        include: { operator: true, manager: true, activeTemplate: { include: { items: { include: { item: true } } } } },
      });
    }),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      location: z.string().min(1),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kiosk.create({ data: input });
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      type: z.string().min(1).optional(),
      location: z.string().min(1).optional(),
      address: z.string().optional(),
      operatorId: z.string().nullable().optional(),
      managerId: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
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
    .input(z.object({
      kioskId: z.string(),
      templateId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.kiosk.update({
        where: { id: input.kioskId },
        data: { activeTemplateId: input.templateId },
      });
    }),
});
