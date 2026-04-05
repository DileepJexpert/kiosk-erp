import { z } from "zod";
import { createTRPCRouter, ownerProcedure, managerProcedure, operatorProcedure } from "../trpc";
import { scanBill, parseTextBill } from "../services/bill-scanner.service";
import {
  validatePrices,
  checkDuplicate,
  updateItemPrices,
  checkTemplateSuggestion,
} from "../services/purchase-smart.service";

export const purchaseSmartRouter = createTRPCRouter({
  // ── AI Bill Scanning (photo) ──
  scanBill: operatorProcedure
    .input(
      z.object({
        imageBase64: z.string().min(100), // base64 encoded image
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Extract items via Claude Vision
      const extracted = await scanBill(input.imageBase64, ctx.db);

      // 2. Price validation
      const priceAlerts = await validatePrices(
        extracted.items.map((i) => ({
          matchedItemId: i.matchedItemId,
          unitPrice: i.unitPrice,
        })),
        ctx.db
      );

      // 3. Duplicate check
      const duplicate = await checkDuplicate(
        extracted.supplier?.matchedId || null,
        new Date(),
        extracted.grandTotal,
        ctx.db
      );

      return {
        extracted,
        priceAlerts,
        isDuplicate: duplicate.isDuplicate,
        duplicateId: duplicate.existingId,
      };
    }),

  // ── Parse text bill (WhatsApp / manual text) ──
  parseText: operatorProcedure
    .input(z.object({ text: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      const extracted = await parseTextBill(input.text, ctx.db);

      const priceAlerts = await validatePrices(
        extracted.items.map((i) => ({
          matchedItemId: i.matchedItemId,
          unitPrice: i.unitPrice,
        })),
        ctx.db
      );

      return { extracted, priceAlerts };
    }),

  // ── Parse voice transcript ──
  parseVoice: operatorProcedure
    .input(z.object({ transcript: z.string().min(3) }))
    .mutation(async ({ ctx, input }) => {
      // Voice transcripts go through the same text parser
      const extracted = await parseTextBill(input.transcript, ctx.db);

      const priceAlerts = await validatePrices(
        extracted.items.map((i) => ({
          matchedItemId: i.matchedItemId,
          unitPrice: i.unitPrice,
        })),
        ctx.db
      );

      return { extracted, priceAlerts, voiceTranscript: input.transcript };
    }),

  // ── Repeat last purchase from a supplier ──
  repeatLast: operatorProcedure
    .input(z.object({ supplierId: z.string() }))
    .query(async ({ ctx, input }) => {
      const lastPurchase = await ctx.db.purchase.findFirst({
        where: { supplierId: input.supplierId },
        orderBy: { createdAt: "desc" },
        include: { items: { include: { item: true } }, supplier: true },
      });
      return lastPurchase;
    }),

  // ── Barcode lookup ──
  lookupBarcode: operatorProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ ctx, input }) => {
      const item = await ctx.db.item.findFirst({
        where: { barcode: input.barcode, isActive: true },
        select: {
          id: true,
          name: true,
          unit: true,
          costPrice: true,
          lastPurchasePrice: true,
        },
      });
      return { found: !!item, item };
    }),

  // ── Save purchase (from any smart method) ──
  saveSmart: operatorProcedure
    .input(
      z.object({
        supplierId: z.string(),
        date: z.date(),
        entryMethod: z.string().default("MANUAL"),
        billPhotoUrl: z.string().optional(),
        billPhotoKey: z.string().optional(),
        aiExtractedRaw: z.any().optional(),
        aiConfidence: z.number().optional(),
        voiceTranscript: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().positive(),
            unitPrice: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const purchaseItems = input.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
      }));

      const totalAmount = purchaseItems.reduce((sum, i) => sum + i.lineTotal, 0);

      return ctx.db.$transaction(async (tx) => {
        // Create purchase
        const purchase = await tx.purchase.create({
          data: {
            supplierId: input.supplierId,
            date: input.date,
            totalAmount,
            notes: input.notes,
            entryMethod: input.entryMethod,
            billPhotoUrl: input.billPhotoUrl,
            billPhotoKey: input.billPhotoKey,
            aiExtractedRaw: input.aiExtractedRaw || undefined,
            aiConfidence: input.aiConfidence,
            voiceTranscript: input.voiceTranscript,
            approvalStatus: "AUTO_APPROVED",
            items: { create: purchaseItems },
          },
          include: { items: { include: { item: true } }, supplier: true },
        });

        // Update central stock
        for (const item of input.items) {
          await tx.centralStock.upsert({
            where: { itemId: item.itemId },
            create: { itemId: item.itemId, currentQty: item.quantity },
            update: { currentQty: { increment: item.quantity } },
          });
        }

        // Update item prices
        await updateItemPrices(
          input.items.map((i) => ({ itemId: i.itemId, unitPrice: i.unitPrice })),
          input.supplierId,
          tx as any
        );

        // Check template suggestion
        const suggestTemplate = await checkTemplateSuggestion(
          input.supplierId,
          tx as any
        );

        return { purchase, suggestTemplate };
      });
    }),

  // ── Batch save (multiple purchases at once) ──
  batchSave: managerProcedure
    .input(
      z.array(
        z.object({
          supplierId: z.string(),
          date: z.date(),
          entryMethod: z.string().default("BATCH_SCAN"),
          billPhotoUrl: z.string().optional(),
          aiExtractedRaw: z.any().optional(),
          aiConfidence: z.number().optional(),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              itemId: z.string(),
              quantity: z.number().positive(),
              unitPrice: z.number().positive(),
            })
          ),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const purchase of input) {
        const purchaseItems = purchase.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.quantity * item.unitPrice,
        }));
        const totalAmount = purchaseItems.reduce((s, i) => s + i.lineTotal, 0);

        const created = await ctx.db.$transaction(async (tx) => {
          const p = await tx.purchase.create({
            data: {
              supplierId: purchase.supplierId,
              date: purchase.date,
              totalAmount,
              entryMethod: purchase.entryMethod,
              billPhotoUrl: purchase.billPhotoUrl,
              aiExtractedRaw: purchase.aiExtractedRaw || undefined,
              aiConfidence: purchase.aiConfidence,
              approvalStatus: "AUTO_APPROVED",
              notes: purchase.notes,
              items: { create: purchaseItems },
            },
            include: { supplier: true },
          });

          for (const item of purchase.items) {
            await tx.centralStock.upsert({
              where: { itemId: item.itemId },
              create: { itemId: item.itemId, currentQty: item.quantity },
              update: { currentQty: { increment: item.quantity } },
            });
          }

          await updateItemPrices(
            purchase.items.map((i) => ({ itemId: i.itemId, unitPrice: i.unitPrice })),
            purchase.supplierId,
            tx as any
          );

          return p;
        });

        results.push(created);
      }
      return { count: results.length, purchases: results };
    }),

  // ── Approve / Reject purchase ──
  approve: ownerProcedure
    .input(z.object({ purchaseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const purchase = await ctx.db.purchase.findUniqueOrThrow({
        where: { id: input.purchaseId },
        include: { items: true },
      });

      if (purchase.approvalStatus !== "PENDING_APPROVAL") {
        throw new Error("Purchase is not pending approval");
      }

      return ctx.db.$transaction(async (tx) => {
        const updated = await tx.purchase.update({
          where: { id: input.purchaseId },
          data: {
            approvalStatus: "APPROVED",
            approvedById: (ctx.session.user as any).id,
            approvedAt: new Date(),
          },
        });

        // Now update stock
        for (const item of purchase.items) {
          await tx.centralStock.upsert({
            where: { itemId: item.itemId },
            create: { itemId: item.itemId, currentQty: item.quantity },
            update: { currentQty: { increment: item.quantity } },
          });
        }

        return updated;
      });
    }),

  reject: ownerProcedure
    .input(
      z.object({
        purchaseId: z.string(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.purchase.update({
        where: { id: input.purchaseId },
        data: {
          approvalStatus: "REJECTED",
          rejectionReason: input.reason,
          approvedById: (ctx.session.user as any).id,
          approvedAt: new Date(),
        },
      });
    }),

  // ── Templates ──
  listTemplates: operatorProcedure
    .input(z.object({ supplierId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.supplierId) where.supplierId = input.supplierId;
      return ctx.db.purchaseTemplate.findMany({
        where,
        include: { supplier: true },
        orderBy: { lastUsedAt: "desc" },
      });
    }),

  saveTemplate: managerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        supplierId: z.string(),
        items: z.any(), // JSON array
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.purchaseTemplate.create({
        data: {
          name: input.name,
          supplierId: input.supplierId,
          items: input.items,
        },
      });
    }),

  useTemplate: operatorProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.purchaseTemplate.update({
        where: { id: input.templateId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
        include: { supplier: true },
      });
    }),

  // ── List today's purchases (for operator stock tab) ──
  todayPurchases: operatorProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return ctx.db.purchase.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ── Pending approvals (for owner) ──
  pendingApprovals: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.purchase.findMany({
      where: { approvalStatus: "PENDING_APPROVAL" },
      include: {
        supplier: true,
        items: { include: { item: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // ── Low stock items ──
  lowStockItems: operatorProcedure.query(async ({ ctx }) => {
    return ctx.db.centralStock.findMany({
      where: {
        lowStockThreshold: { gt: 0 },
      },
      include: { item: true },
    }).then((stocks) =>
      stocks.filter((s) => s.currentQty <= s.lowStockThreshold)
    );
  }),

  // ── Item aliases management ──
  listAliases: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.itemAliasGlobal.findMany({
      orderBy: { canonical: "asc" },
    });
  }),

  addAlias: ownerProcedure
    .input(
      z.object({
        alias: z.string().min(1),
        canonical: z.string().min(1),
        category: z.string().min(1),
        language: z.string().default("hi"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.itemAliasGlobal.create({ data: input });
    }),
});
