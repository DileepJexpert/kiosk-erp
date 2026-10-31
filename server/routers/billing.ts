import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { createBill, getDaySummary } from "../services/billing.service";

export const billingRouter = createTRPCRouter({
  create: operatorProcedure
    .input(
      z.object({
        kioskId: z.string(),
        date: z.date(),
        paymentMode: z.enum(["CASH", "UPI", "MIXED"]).default("CASH"),
        upiTransactionRef: z.string().optional(),
        cashAmount: z.number().optional(),
        upiAmount: z.number().optional(),
        orderChannel: z.enum(["WALK_IN", "SWIGGY", "ZOMATO", "PHONE", "OTHER"]).default("WALK_IN"),
        channelOrderId: z.string().optional(),
        channelCommissionRate: z.number().optional(),
        customerName: z.string().optional(),
        customerPhone: z.string().optional(),
        customerId: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive(),
            unitPrice: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createBill(
        input.kioskId,
        ctx.session.user.id,
        input.date,
        input.items,
        input.paymentMode,
        input.customerName,
        input.customerPhone,
        input.notes,
        {
          upiTransactionRef: input.upiTransactionRef,
          cashAmount: input.cashAmount,
          upiAmount: input.upiAmount,
          orderChannel: input.orderChannel,
          channelOrderId: input.channelOrderId,
          channelCommissionRate: input.channelCommissionRate,
          customerId: input.customerId,
        }
      );
    }),

  createPublicOrder: publicProcedure
    .input(
      z.object({
        kioskId: z.string(),
        paymentMode: z.enum(["CASH", "UPI"]).default("UPI"),
        customerPhone: z.string().optional(),
        customerName: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive(),
            unitPrice: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const kiosk = await ctx.db.kiosk.findUnique({
        where: { id: input.kioskId },
      });
      if (!kiosk) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Kiosk not found" });
      }

      let operatorId = kiosk.operatorId;
      if (!operatorId) {
        const defaultUser = await ctx.db.user.findFirst();
        if (!defaultUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No system operator configured",
          });
        }
        operatorId = defaultUser.id;
      }

      return createBill(
        input.kioskId,
        operatorId,
        new Date(),
        input.items,
        input.paymentMode,
        input.customerName || "Counter Guest",
        input.customerPhone,
        "Counter Self-Order QR",
        {
          orderChannel: "OTHER",
        }
      );
    }),

  list: protectedProcedure
    .input(
      z.object({
        kioskId: z.string().optional(),
        date: z.date().optional(),
        paymentMode: z.enum(["CASH", "UPI", "MIXED"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const role = (ctx.session.user as any).role;
      const where: any = {};

      if (role === "OPERATOR") {
        where.operatorId = ctx.session.user.id;
      } else if (input?.kioskId) {
        where.kioskId = input.kioskId;
      }

      if (input?.date) where.date = input.date;
      if (input?.paymentMode) where.paymentMode = input.paymentMode;

      return ctx.db.bill.findMany({
        where,
        include: {
          kiosk: true,
          operator: true,
          items: { include: { item: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  getDaySummary: protectedProcedure
    .input(
      z.object({
        kioskId: z.string(),
        date: z.date(),
      })
    )
    .query(async ({ input }) => {
      return getDaySummary(input.kioskId, input.date);
    }),

  getReceipt: protectedProcedure
    .input(z.object({ billId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.bill.findUniqueOrThrow({
        where: { id: input.billId },
        include: {
          kiosk: true,
          operator: true,
          items: { include: { item: true } },
        },
      });
    }),
});
