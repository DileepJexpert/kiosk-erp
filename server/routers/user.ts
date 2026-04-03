import { z } from "zod";
import { createTRPCRouter, ownerProcedure, protectedProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  list: ownerProcedure
    .input(z.object({ role: z.enum(["OWNER", "MANAGER", "OPERATOR"]).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findMany({
        where: input?.role ? { role: input.role } : undefined,
        include: { assignedKiosk: true },
        orderBy: { name: "asc" },
      });
    }),

  create: ownerProcedure
    .input(z.object({
      name: z.string().min(1),
      phone: z.string().length(10),
      role: z.enum(["MANAGER", "OPERATOR"]),
      aadhaar: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.create({ data: input });
    }),

  update: ownerProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      phone: z.string().length(10).optional(),
      aadhaar: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.user.update({ where: { id }, data });
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      include: { assignedKiosk: true },
    });
  }),
});
