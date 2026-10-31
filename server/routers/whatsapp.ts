import { z } from "zod";
import { createTRPCRouter, protectedProcedure, ownerProcedure } from "../trpc";
import { whatsappService } from "@/lib/whatsapp";

export const whatsappRouter = createTRPCRouter({
  getEodSummary: ownerProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const targetDate = input?.date ? new Date(input.date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Fetch bills for the day
      const bills = await ctx.db.bill.findMany({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        include: {
          kiosk: true,
          items: {
            include: { item: true },
          },
        },
      });

      // 2. Fetch reconciliations for cash shortage
      const recons = await ctx.db.reconciliation.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
        },
        include: { kiosk: true },
      });

      let totalSales = 0;
      let cashSales = 0;
      let upiSales = 0;
      const kioskMap: Record<string, { name: string; sales: number; bills: number; cashShortage: number }> = {};
      const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};

      for (const bill of bills) {
        totalSales += bill.total;
        if (bill.paymentMode === "CASH") cashSales += bill.total;
        else if (bill.paymentMode === "UPI") upiSales += bill.total;
        else {
          cashSales += bill.cashAmount || 0;
          upiSales += bill.upiAmount || 0;
        }

        if (!kioskMap[bill.kioskId]) {
          kioskMap[bill.kioskId] = {
            name: bill.kiosk.name,
            sales: 0,
            bills: 0,
            cashShortage: 0,
          };
        }
        kioskMap[bill.kioskId].sales += bill.total;
        kioskMap[bill.kioskId].bills += 1;

        for (const it of bill.items) {
          if (!itemCounts[it.itemId]) {
            itemCounts[it.itemId] = {
              name: it.item.name,
              quantity: 0,
              revenue: 0,
            };
          }
          itemCounts[it.itemId].quantity += it.quantity;
          itemCounts[it.itemId].revenue += it.lineTotal;
        }
      }

      let totalCashShortage = 0;
      for (const r of recons) {
        if (r.totalLoss > 0) {
          totalCashShortage += r.totalLoss;
          if (kioskMap[r.kioskId]) {
            kioskMap[r.kioskId].cashShortage += r.totalLoss;
          }
        }
      }

      const topItems = Object.values(itemCounts)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      const summaryData = {
        date: targetDate.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        totalSales: Math.round(totalSales),
        cashSales: Math.round(cashSales),
        upiSales: Math.round(upiSales),
        billCount: bills.length,
        cashShortageTotal: Math.round(totalCashShortage),
        kiosks: Object.values(kioskMap),
        topItems,
      };

      const messageText = whatsappService.formatEODSummary(summaryData);

      // Fetch owner phone for direct WhatsApp link
      const owner = await ctx.db.user.findFirst({
        where: { role: "OWNER" },
      });

      const whatsappLink = owner?.phone
        ? whatsappService.createWhatsAppLink(owner.phone, messageText)
        : null;

      return {
        summaryData,
        messageText,
        whatsappLink,
        ownerPhone: owner?.phone,
      };
    }),

  getCustomerBill: protectedProcedure
    .input(z.object({ billId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bill = await ctx.db.bill.findUniqueOrThrow({
        where: { id: input.billId },
        include: {
          kiosk: true,
          items: {
            include: { item: true },
          },
        },
      });

      const billData = {
        billNumber: String(bill.billNumber),
        kioskName: bill.kiosk.name,
        kioskLocation: bill.kiosk.location,
        date: bill.createdAt.toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        }),
        customerPhone: bill.customerPhone || undefined,
        items: bill.items.map((it) => ({
          name: it.item.name,
          quantity: it.quantity,
          price: it.unitPrice,
          total: it.lineTotal,
        })),
        subtotal: bill.subtotal,
        discount: 0,
        gstAmount: bill.gstAmount,
        total: bill.total,
        paymentMode: bill.paymentMode,
        gstin: bill.kiosk.gstin || undefined,
      };

      const messageText = whatsappService.formatCustomerEBill(billData);
      const whatsappLink = bill.customerPhone
        ? whatsappService.createWhatsAppLink(bill.customerPhone, messageText)
        : null;

      return {
        messageText,
        whatsappLink,
      };
    }),
});
