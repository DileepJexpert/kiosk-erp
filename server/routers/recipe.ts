import { z } from "zod";
import { createTRPCRouter, protectedProcedure, ownerProcedure } from "../trpc";

export const recipeRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.item.findMany({
      where: { isActive: true },
      include: {
        recipe: {
          include: {
            ingredients: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return items.map((item) => {
      const ingredients = item.recipe?.ingredients || [];
      const totalIngredientCost = ingredients.reduce((sum, ing) => {
        return sum + ing.quantity * ing.costPerUnit;
      }, 0);

      const margin = item.sellPrice > 0
        ? Math.round(((item.sellPrice - totalIngredientCost) / item.sellPrice) * 100)
        : 0;

      return {
        itemId: item.id,
        itemName: item.name,
        category: item.category,
        sellPrice: item.sellPrice,
        hasRecipe: !!item.recipe,
        recipeId: item.recipe?.id,
        instructions: item.recipe?.instructions,
        yieldCount: item.recipe?.yieldCount || 1,
        ingredients,
        totalIngredientCost: Math.round(totalIngredientCost * 100) / 100,
        grossMarginPercent: margin,
      };
    });
  }),

  getById: protectedProcedure
    .input(z.object({ itemId: z.string() }))
    .query(async ({ ctx, input }) => {
      const recipe = await ctx.db.recipe.findUnique({
        where: { itemId: input.itemId },
        include: {
          item: true,
          ingredients: true,
        },
      });

      if (!recipe) return null;

      const totalIngredientCost = recipe.ingredients.reduce(
        (sum, ing) => sum + ing.quantity * ing.costPerUnit,
        0
      );

      return {
        ...recipe,
        totalIngredientCost: Math.round(totalIngredientCost * 100) / 100,
        marginPercent:
          recipe.item.sellPrice > 0
            ? Math.round(
                ((recipe.item.sellPrice - totalIngredientCost) /
                  recipe.item.sellPrice) *
                  100
              )
            : 0,
      };
    }),

  upsert: ownerProcedure
    .input(
      z.object({
        itemId: z.string(),
        instructions: z.string().optional(),
        yieldCount: z.number().min(1).default(1),
        ingredients: z.array(
          z.object({
            ingredientName: z.string().min(1, "Ingredient name required"),
            unit: z.string().min(1, "Unit required"),
            quantity: z.number().min(0.001, "Quantity must be > 0"),
            costPerUnit: z.number().min(0).default(0),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.recipe.findUnique({
        where: { itemId: input.itemId },
      });

      if (existing) {
        await ctx.db.recipeIngredient.deleteMany({
          where: { recipeId: existing.id },
        });

        return ctx.db.recipe.update({
          where: { id: existing.id },
          data: {
            instructions: input.instructions,
            yieldCount: input.yieldCount,
            ingredients: {
              create: input.ingredients,
            },
          },
          include: { ingredients: true },
        });
      }

      return ctx.db.recipe.create({
        data: {
          itemId: input.itemId,
          instructions: input.instructions,
          yieldCount: input.yieldCount,
          ingredients: {
            create: input.ingredients,
          },
        },
        include: { ingredients: true },
      });
    }),

  calculateVariance: ownerProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const start = input.startDate
        ? new Date(input.startDate)
        : new Date(Date.now() - 7 * 86400000);
      const end = input.endDate ? new Date(input.endDate) : new Date();

      const billItems = await ctx.db.billItem.findMany({
        where: {
          bill: {
            createdAt: { gte: start, lte: end },
          },
        },
        include: {
          item: {
            include: {
              recipe: {
                include: { ingredients: true },
              },
            },
          },
        },
      });

      const ingredientConsumption: Record<
        string,
        {
          name: string;
          unit: string;
          theoreticalUsed: number;
          estimatedCost: number;
        }
      > = {};

      for (const bi of billItems) {
        const recipe = bi.item.recipe;
        if (!recipe) continue;

        for (const ing of recipe.ingredients) {
          const key = `${ing.ingredientName}_${ing.unit}`;
          if (!ingredientConsumption[key]) {
            ingredientConsumption[key] = {
              name: ing.ingredientName,
              unit: ing.unit,
              theoreticalUsed: 0,
              estimatedCost: 0,
            };
          }
          const consumed = (ing.quantity / (recipe.yieldCount || 1)) * bi.quantity;
          ingredientConsumption[key].theoreticalUsed += consumed;
          ingredientConsumption[key].estimatedCost += consumed * ing.costPerUnit;
        }
      }

      return Object.values(ingredientConsumption).map((row) => ({
        ...row,
        theoreticalUsed: Math.round(row.theoreticalUsed * 100) / 100,
        estimatedCost: Math.round(row.estimatedCost * 100) / 100,
      }));
    }),
});
