import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure, protectedProcedure, publicProcedure } from "../trpc";
import { createBill, getDaySummary, generateZReport } from "../services/billing.service";

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
        orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]).default("DINE_IN"),
        discountAmount: z.number().optional(),
        discountReason: z.string().optional(),
        tenderAmount: z.number().optional(),
        changeReturned: z.number().optional(),
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
            modifiers: z
              .array(
                z.object({
                  name: z.string(),
                  price: z.number(),
                })
              )
              .optional(),
            notes: z.string().optional(),
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
          orderType: input.orderType,
          discountAmount: input.discountAmount,
          discountReason: input.discountReason,
          tenderAmount: input.tenderAmount,
          changeReturned: input.changeReturned,
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

      const bill = await createBill(
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

      // Auto-credit loyalty stamp if customer entered phone number
      let loyaltyInfo = null;
      if (input.customerPhone) {
        try {
          let customer = await ctx.db.customer.findUnique({
            where: { phone: input.customerPhone },
          });
          if (!customer) {
            customer = await ctx.db.customer.create({
              data: {
                phone: input.customerPhone,
                name: input.customerName || "Valued Customer",
                totalVisits: 1,
                stampsCount: 1,
                freeChaisAvailable: 0,
                totalSpend: bill.total,
                lastVisitAt: new Date(),
              },
            });
            loyaltyInfo = {
              stampsCount: 1,
              targetStamps: 5,
              freeChaisAvailable: 0,
              earnedReward: false,
            };
          } else {
            const nextStamps = customer.stampsCount + 1;
            const rewardEarned = nextStamps >= 5;
            const newStamps = rewardEarned ? nextStamps % 5 : nextStamps;
            const extraReward = rewardEarned ? 1 : 0;
            customer = await ctx.db.customer.update({
              where: { id: customer.id },
              data: {
                totalVisits: customer.totalVisits + 1,
                totalSpend: customer.totalSpend + bill.total,
                stampsCount: newStamps,
                freeChaisAvailable: customer.freeChaisAvailable + extraReward,
                lastVisitAt: new Date(),
              },
            });
            loyaltyInfo = {
              stampsCount: newStamps,
              targetStamps: 5,
              freeChaisAvailable: customer.freeChaisAvailable,
              earnedReward: rewardEarned,
            };
          }
        } catch (e) {
          console.error("Failed to auto-credit loyalty stamp", e);
        }
      }

      return {
        ...bill,
        loyaltyInfo,
      };
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

  getLiveTokens: publicProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const activeBills = await ctx.db.bill.findMany({
        where: {
          kioskId: input.kioskId,
          createdAt: { gte: today },
          orderStatus: { in: ["PREPARING", "READY"] },
        },
        include: {
          items: { include: { item: true } },
        },
        orderBy: { createdAt: "asc" },
      });

      const preparing = activeBills
        .filter((b) => b.orderStatus === "PREPARING")
        .map((b) => ({
          id: b.id,
          tokenNumber: String(b.billNumber).padStart(4, "0"),
          itemCount: b.items.reduce((s, it) => s + it.quantity, 0),
          createdAt: b.createdAt,
        }));

      const ready = activeBills
        .filter((b) => b.orderStatus === "READY")
        .map((b) => ({
          id: b.id,
          tokenNumber: String(b.billNumber).padStart(4, "0"),
          itemCount: b.items.reduce((s, it) => s + it.quantity, 0),
          readyAt: b.readyAt || b.createdAt,
        }));

      return {
        preparing,
        ready,
      };
    }),

  updateOrderStatus: operatorProcedure
    .input(
      z.object({
        billId: z.string(),
        orderStatus: z.enum(["PREPARING", "READY", "COMPLETED", "CANCELLED"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.bill.update({
        where: { id: input.billId },
        data: {
          orderStatus: input.orderStatus,
          ...(input.orderStatus === "READY" && { readyAt: new Date() }),
        },
      });
    }),

  // ── Kitchen Display System (KDS) Live Orders Stream ──
  getKDSOrders: operatorProcedure
    .input(z.object({ kioskId: z.string() }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return ctx.db.bill.findMany({
        where: {
          kioskId: input.kioskId,
          createdAt: { gte: today },
          orderStatus: { in: ["PREPARING", "READY"] },
        },
        include: {
          items: {
            include: { item: true },
          },
          operator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }),

  startCooking: operatorProcedure
    .input(z.object({ billId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.bill.update({
        where: { id: input.billId },
        data: {
          orderStatus: "PREPARING",
          cookingStartedAt: new Date(),
        },
      });
    }),

  // ── Shift Closing Z-Report ──
  getZReport: operatorProcedure
    .input(z.object({ kioskId: z.string(), date: z.date() }))
    .query(async ({ input }) => {
      return generateZReport(input.kioskId, input.date);
    }),
});
