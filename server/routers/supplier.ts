import { z } from "zod";
import { createTRPCRouter, ownerProcedure } from "../trpc";

export const supplierRouter = createTRPCRouter({
  list: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.supplier.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { purchases: true } } },
    });
  }),

  create: ownerProcedure
    .input(
      z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        address: z.string().optional(),
        gstNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.supplier.create({ data: input });
    }),

  update: ownerProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        gstNumber: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.supplier.update({ where: { id }, data });
    }),

  createPurchase: ownerProcedure
    .input(
      z.object({
        supplierId: z.string(),
        date: z.date(),
        invoiceNo: z.string().optional(),
        notes: z.string().optional(),
        items: z.array(
          z.object({
            itemId: z.string(),
            quantity: z.number().int().positive(),
            unitCost: z.number().positive(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const purchaseItems = input.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.quantity * item.unitCost,
      }));

      const totalAmount = purchaseItems.reduce((sum, i) => sum + i.lineTotal, 0);

      return ctx.db.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
          data: {
            supplierId: input.supplierId,
            date: input.date,
            invoiceNo: input.invoiceNo,
            totalAmount,
            notes: input.notes,
            items: { create: purchaseItems },
          },
          include: { items: { include: { item: true } } },
        });

        // Update central stock
        for (const item of input.items) {
          await tx.centralStock.upsert({
            where: { itemId: item.itemId },
            create: { itemId: item.itemId, quantity: item.quantity },
            update: { quantity: { increment: item.quantity } },
          });
        }

        return purchase;
      });
    }),

  listPurchases: ownerProcedure
    .input(
      z.object({
        supplierId: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input?.supplierId) where.supplierId = input.supplierId;

      return ctx.db.purchase.findMany({
        where,
        include: {
          supplier: true,
          items: { include: { item: true } },
        },
        orderBy: { date: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  getStock: ownerProcedure.query(async ({ ctx }) => {
    return ctx.db.centralStock.findMany({
      include: { item: true },
      orderBy: { item: { name: "asc" } },
    });
  }),
});
