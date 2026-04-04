import { z } from "zod";
import { createTRPCRouter, operatorProcedure, managerProcedure, ownerProcedure } from "../trpc";
import { checkIn, checkOut, markAttendance, getMonthlyAttendance } from "../services/attendance.service";

export const attendanceRouter = createTRPCRouter({
  checkIn: operatorProcedure
    .input(z.object({ kioskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return checkIn(ctx.session.user.id, input.kioskId, today);
    }),

  checkOut: operatorProcedure
    .mutation(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return checkOut(ctx.session.user.id, today);
    }),

  markAttendance: managerProcedure
    .input(
      z.object({
        operatorId: z.string(),
        kioskId: z.string(),
        date: z.date(),
        status: z.enum(["PRESENT", "ABSENT", "HALF_DAY", "LEAVE"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return markAttendance(
        input.operatorId,
        input.kioskId,
        input.date,
        input.status,
        input.notes
      );
    }),

  getMonthly: managerProcedure
    .input(
      z.object({
        operatorId: z.string(),
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ input }) => {
      return getMonthlyAttendance(input.operatorId, input.month);
    }),

  getMyMonthly: operatorProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/),
      })
    )
    .query(async ({ ctx, input }) => {
      return getMonthlyAttendance(ctx.session.user.id, input.month);
    }),

  getToday: operatorProcedure
    .query(async ({ ctx }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return ctx.db.attendance.findUnique({
        where: { operatorId_date: { operatorId: ctx.session.user.id, date: today } },
      });
    }),

  listByKiosk: ownerProcedure
    .input(
      z.object({
        kioskId: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.attendance.findMany({
        where: {
          kioskId: input.kioskId,
          date: { gte: input.startDate, lte: input.endDate },
        },
        include: { operator: true },
        orderBy: { date: "desc" },
      });
    }),
});
