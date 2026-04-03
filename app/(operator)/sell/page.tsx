"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}

export default function SellPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "MIXED">("CASH");
  const utils = trpc.useUtils();

  const items = trpc.item.listSellable.useQuery();
  const profile = trpc.user.getProfile.useQuery();

  const createBill = trpc.billing.create.useMutation({
    onSuccess: () => {
      setCart([]);
      toast.success("Bill created successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  const addToCart = (item: { id: string; name: string; sellPrice: number; unit: string }) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.itemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { itemId: item.id, name: item.name, unitPrice: item.sellPrice, quantity: 1, unit: item.unit }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.itemId === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.itemId !== itemId));
  };

  const total = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const handleCreateBill = () => {
    if (cart.length === 0 || !profile.data?.assignedKiosk) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    createBill.mutate({
      kioskId: profile.data.assignedKiosk.id,
      date: today,
      paymentMode,
      items: cart.map((c) => ({
        itemId: c.itemId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
    });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Item Grid */}
      <div>
        <h1 className="text-xl font-bold mb-3">Sell</h1>
        {items.isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {items.data?.map((item) => {
              const inCart = cart.find((c) => c.itemId === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all active:scale-95 ${
                    inCart
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-sm leading-tight">{item.name}</p>
                  <p className="text-lg font-bold text-orange-600 mt-1">
                    {formatRupee(item.sellPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground">per {item.unit}</p>
                  {inCart && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold h-6 w-6 rounded-full flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart */}
      {cart.length > 0 && (
        <Card className="border-2 border-orange-200">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="h-4 w-4 text-orange-600" />
              <span className="font-bold text-sm">Cart ({cart.length} items)</span>
            </div>

            {cart.map((item) => (
              <div key={item.itemId} className="flex items-center gap-2 py-2 border-b last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatRupee(item.unitPrice)} x {item.quantity} = {formatRupee(item.unitPrice * item.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQty(item.itemId, -1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateQty(item.itemId, 1)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={() => removeFromCart(item.itemId)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Payment mode */}
            <div className="flex gap-2">
              {(["CASH", "UPI", "MIXED"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={paymentMode === mode ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setPaymentMode(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>

            {/* Total and submit */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-orange-600">{formatRupee(total)}</span>
            </div>
            <Button
              className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700"
              onClick={handleCreateBill}
              disabled={createBill.isPending}
            >
              {createBill.isPending ? "Saving..." : `Save Bill - ${formatRupee(total)}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
