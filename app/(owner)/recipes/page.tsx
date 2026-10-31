"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UtensilsCrossed, Plus, Trash2, TrendingUp, AlertTriangle, Scale, ChefHat } from "lucide-react";
import { toast } from "sonner";

interface IngredientInput {
  ingredientName: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
}

export default function RecipesPage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [yieldCount, setYieldCount] = useState(1);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { ingredientName: "", unit: "g", quantity: 10, costPerUnit: 0.5 },
  ]);

  const recipes = trpc.recipe.list.useQuery();
  const variance = trpc.recipe.calculateVariance.useQuery({});
  const upsertRecipe = trpc.recipe.upsert.useMutation({
    onSuccess: () => {
      toast.success("Recipe saved successfully!");
      setIsDialogOpen(false);
      recipes.refetch();
      variance.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openRecipeDialog = (item: any) => {
    setSelectedItemId(item.itemId);
    setInstructions(item.instructions || "");
    setYieldCount(item.yieldCount || 1);
    if (item.ingredients && item.ingredients.length > 0) {
      setIngredients(
        item.ingredients.map((ing: any) => ({
          ingredientName: ing.ingredientName,
          unit: ing.unit,
          quantity: ing.quantity,
          costPerUnit: ing.costPerUnit,
        }))
      );
    } else {
      setIngredients([{ ingredientName: "", unit: "g", quantity: 10, costPerUnit: 0.5 }]);
    }
    setIsDialogOpen(true);
  };

  const addIngredientRow = () => {
    setIngredients((prev) => [
      ...prev,
      { ingredientName: "", unit: "g", quantity: 1, costPerUnit: 0 },
    ]);
  };

  const removeIngredientRow = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const updateIngredientRow = (index: number, field: keyof IngredientInput, value: any) => {
    setIngredients((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveRecipe = () => {
    if (!selectedItemId) return;
    const valid = ingredients.filter((ing) => ing.ingredientName.trim().length > 0);
    if (valid.length === 0) {
      toast.error("Please add at least one ingredient");
      return;
    }
    upsertRecipe.mutate({
      itemId: selectedItemId,
      instructions,
      yieldCount: Number(yieldCount) || 1,
      ingredients: valid.map((ing) => ({
        ingredientName: ing.ingredientName.trim(),
        unit: ing.unit.trim(),
        quantity: Number(ing.quantity) || 0.01,
        costPerUnit: Number(ing.costPerUnit) || 0,
      })),
    });
  };

  const selectedItemData = recipes.data?.find((r: any) => r.itemId === selectedItemId);

  const totalCalculatedCost = ingredients.reduce((sum, ing) => {
    return sum + (Number(ing.quantity) || 0) * (Number(ing.costPerUnit) || 0);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UtensilsCrossed className="h-6 w-6 text-orange-600" />
            Recipe Management & Bill of Materials (BOM)
          </h1>
          <p className="text-muted-foreground text-sm">
            Standardize item formulations, calculate real ingredient food costs, and prevent raw material shrinkage.
          </p>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="w-full">
        <TabsList className="grid w-full sm:w-auto grid-cols-2">
          <TabsTrigger value="catalog">Item Recipes ({recipes.data?.length || 0})</TabsTrigger>
          <TabsTrigger value="variance">Raw Material Consumption</TabsTrigger>
        </TabsList>

        {/* Tab 1: Recipe Catalog */}
        <TabsContent value="catalog" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.isLoading ? (
              <p className="text-sm text-muted-foreground col-span-3">Loading recipe catalog...</p>
            ) : recipes.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground col-span-3">No active items found.</p>
            ) : (
              recipes.data?.map((recipe: any) => (
                <Card key={recipe.itemId} className="flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <CardTitle className="text-lg font-bold">{recipe.itemName}</CardTitle>
                        <CardDescription className="text-xs capitalize">{recipe.category.toLowerCase()}</CardDescription>
                      </div>
                      <Badge variant={recipe.hasRecipe ? "default" : "secondary"}>
                        {recipe.hasRecipe ? "Recipe Defined" : "No Recipe"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col justify-between">
                    <div className="bg-slate-50 p-3 rounded-lg border text-sm space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Selling Price:</span>
                        <span className="font-semibold">{formatRupee(recipe.sellPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Ingredient Cost:</span>
                        <span className="font-semibold text-amber-700">
                          {recipe.hasRecipe ? formatRupee(recipe.totalIngredientCost) : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t">
                        <span className="text-muted-foreground">Gross Food Margin:</span>
                        <span
                          className={`font-bold ${
                            recipe.grossMarginPercent >= 50
                              ? "text-emerald-600"
                              : recipe.grossMarginPercent >= 30
                              ? "text-amber-600"
                              : "text-red-600"
                          }`}
                        >
                          {recipe.hasRecipe ? `${recipe.grossMarginPercent}%` : "—"}
                        </span>
                      </div>
                    </div>

                    {recipe.hasRecipe && recipe.ingredients.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium text-slate-700">Ingredients ({recipe.ingredients.length}): </span>
                        {recipe.ingredients.map((ing: any) => `${ing.ingredientName} (${ing.quantity}${ing.unit})`).join(", ")}
                      </div>
                    )}

                    <Button
                      variant={recipe.hasRecipe ? "outline" : "default"}
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => openRecipeDialog(recipe)}
                    >
                      {recipe.hasRecipe ? "Edit Recipe (BOM)" : "+ Add Recipe"}
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Tab 2: Theoretical Raw Material Consumption */}
        <TabsContent value="variance" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-indigo-600" />
                Theoretical Raw Material Consumption (Last 7 Days)
              </CardTitle>
              <CardDescription>
                Calculates the exact theoretical quantity of ingredients that should have been consumed based on all bills generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {variance.isLoading ? (
                <p className="text-sm text-muted-foreground">Calculating consumption...</p>
              ) : variance.data?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground space-y-2">
                  <ChefHat className="h-10 w-10 mx-auto text-slate-300" />
                  <p>No recipe consumption records found for recent orders.</p>
                  <p className="text-xs">Ensure your sold items have defined recipes in the first tab.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground text-xs uppercase">
                        <th className="py-2.5">Raw Material / Ingredient</th>
                        <th className="py-2.5 text-right">Theoretical Usage</th>
                        <th className="py-2.5 text-right">Estimated Total Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variance.data?.map((row: any, idx: number) => (
                        <tr key={idx} className="border-b hover:bg-slate-50/50">
                          <td className="py-2.5 font-medium">{row.name}</td>
                          <td className="py-2.5 text-right font-mono">
                            {row.theoreticalUsed.toLocaleString("en-IN")} {row.unit}
                          </td>
                          <td className="py-2.5 text-right font-semibold text-slate-900">
                            {formatRupee(row.estimatedCost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recipe Builder Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recipe Formulation — {selectedItemData?.itemName}</DialogTitle>
            <DialogDescription>
              Specify ingredients required per single serving or batch to calculate cost and margin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="yield">Yield Count (Servings per formulation)</Label>
                <Input
                  id="yield"
                  type="number"
                  min="1"
                  value={yieldCount}
                  onChange={(e) => setYieldCount(Math.max(1, Number(e.target.value) || 1))}
                  className="mt-1"
                />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs flex flex-col justify-center">
                <span className="text-orange-800 font-medium">Selling Price: {formatRupee(selectedItemData?.sellPrice || 0)}</span>
                <span className="text-orange-950 font-bold mt-0.5">
                  Calculated Cost: {formatRupee(totalCalculatedCost)} (
                  {selectedItemData?.sellPrice
                    ? `${Math.round(((selectedItemData.sellPrice - totalCalculatedCost) / selectedItemData.sellPrice) * 100)}% margin`
                    : "0%"}
                  )
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-semibold">Ingredients Breakdown</Label>
                <Button variant="ghost" size="sm" onClick={addIngredientRow} className="text-xs text-orange-600">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Ingredient
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      placeholder="e.g. Milk, Flour, Oil"
                      value={ing.ingredientName}
                      onChange={(e) => updateIngredientRow(idx, "ingredientName", e.target.value)}
                      className="flex-1 text-sm"
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => updateIngredientRow(idx, "quantity", e.target.value)}
                      className="w-20 text-sm font-mono"
                    />
                    <Input
                      placeholder="Unit"
                      value={ing.unit}
                      onChange={(e) => updateIngredientRow(idx, "unit", e.target.value)}
                      className="w-16 text-sm"
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="Cost/unit"
                      value={ing.costPerUnit}
                      onChange={(e) => updateIngredientRow(idx, "costPerUnit", e.target.value)}
                      className="w-24 text-sm font-mono"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeIngredientRow(idx)}
                      disabled={ingredients.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="inst">Standard Operating Procedure (Preparation Notes)</Label>
              <textarea
                id="inst"
                rows={3}
                placeholder="Step-by-step cooking / boiling / assembly instructions..."
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full mt-1 p-2 text-sm border rounded-md"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={handleSaveRecipe}
              disabled={upsertRecipe.isPending}
            >
              {upsertRecipe.isPending ? "Saving..." : "Save Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
