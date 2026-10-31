"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Store,
  Plus,
  Minus,
  QrCode,
  CheckCircle2,
  Languages,
  Coffee,
  Utensils,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CustomerSelfOrderPage() {
  const params = useParams();
  const kioskId = params?.kioskId as string;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderConfirmed, setOrderConfirmed] = useState<any>(null);

  const kioskMenu = trpc.kiosk.getPublicMenu.useQuery({ kioskId }, { enabled: !!kioskId });

  const createBill = trpc.billing.createPublicOrder.useMutation({
    onSuccess: (bill: any) => {
      setOrderConfirmed(bill);
      setCart([]);
      toast.success(lang === "hi" ? "ऑर्डर सफलतापूर्वक दर्ज किया गया!" : "Order placed successfully!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, price: item.sellPrice, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0);
    });
  };

  const totalAmount = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handlePlaceOrder = (paymentMode: "UPI" | "CASH") => {
    if (cart.length === 0) return;
    createBill.mutate({
      kioskId,
      paymentMode,
      customerPhone: customerPhone || undefined,
      items: cart.map((i) => ({
        itemId: i.id,
        quantity: i.quantity,
        unitPrice: i.price,
      })),
    });
  };

  const filteredItems = kioskMenu.data?.items?.filter((it: any) => {
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = selectedCategory === "ALL" || it.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-28">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-base text-slate-900 leading-tight">
              {kioskMenu.data?.name || "Kiosk Counter"}
            </h1>
            <p className="text-[11px] text-muted-foreground">{kioskMenu.data?.location || "Self-Ordering Portal"}</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-8 gap-1.5"
          onClick={() => setLang(lang === "en" ? "hi" : "en")}
        >
          <Languages className="h-3.5 w-3.5 text-orange-600" />
          {lang === "en" ? "हिंदी" : "English"}
        </Button>
      </header>

      {/* Main Order Content */}
      <main className="p-4 max-w-lg mx-auto w-full space-y-4">
        {/* Search & Categories */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder={lang === "hi" ? "चाय, रोल्स, मोमोज़ खोजें..." : "Search chai, rolls, snacks..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            <Button
              variant={selectedCategory === "ALL" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-7 px-3 shrink-0"
              onClick={() => setSelectedCategory("ALL")}
            >
              {lang === "hi" ? "सभी आइटम" : "All Items"}
            </Button>
            <Button
              variant={selectedCategory === "BEVERAGE" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-7 px-3 shrink-0"
              onClick={() => setSelectedCategory("BEVERAGE")}
            >
              <Coffee className="h-3 w-3 mr-1" />
              {lang === "hi" ? "चाय एवं पेय" : "Chai & Drinks"}
            </Button>
            <Button
              variant={selectedCategory === "FOOD" ? "default" : "outline"}
              size="sm"
              className="rounded-full text-xs h-7 px-3 shrink-0"
              onClick={() => setSelectedCategory("FOOD")}
            >
              <Utensils className="h-3 w-3 mr-1" />
              {lang === "hi" ? "नाश्ता एवं रोल्स" : "Food & Snacks"}
            </Button>
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="space-y-2.5">
          {kioskMenu.isLoading ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Loading fresh menu...</p>
          ) : filteredItems?.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">No matching items found.</p>
          ) : (
            filteredItems?.map((item: any) => {
              const inCart = cart.find((i) => i.id === item.id);
              return (
                <Card key={item.id} className="p-3 bg-white border flex justify-between items-center shadow-xs">
                  <div className="space-y-0.5">
                    <h3 className="font-semibold text-sm text-slate-900">{item.name}</h3>
                    <p className="text-xs font-bold text-orange-600">{formatRupee(item.sellPrice)}</p>
                  </div>

                  {inCart ? (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg p-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-orange-600"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="font-bold text-sm text-orange-950 w-4 text-center">{inCart.quantity}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-orange-600"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50 text-xs h-8 px-3 font-semibold"
                      onClick={() => addToCart(item)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      {lang === "hi" ? "जोड़ें" : "ADD"}
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Checkout Footer */}
      {cart.length > 0 && !orderConfirmed && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t p-3 shadow-lg z-40 max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-2.5 text-xs text-slate-700">
            <span>
              {cart.reduce((s, i) => s + i.quantity, 0)} {lang === "hi" ? "आइटम चुने गए" : "items selected"}
            </span>
            <span className="text-base font-bold text-slate-900">{formatRupee(totalAmount)}</span>
          </div>

          <div className="space-y-2">
            <Input
              placeholder={lang === "hi" ? "मोबाइल नंबर (व्हाट्सएप बिल के लिए)" : "Phone number (for WhatsApp e-bill)"}
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="text-xs h-8"
              maxLength={10}
            />

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="text-xs h-10 border-slate-300 font-semibold"
                onClick={() => handlePlaceOrder("CASH")}
                disabled={createBill.isPending}
              >
                {lang === "hi" ? "काउंटर पर नकद दें" : "Pay Cash at Counter"}
              </Button>
              <Button
                className="text-xs h-10 bg-orange-600 hover:bg-orange-700 font-semibold gap-1.5"
                onClick={() => handlePlaceOrder("UPI")}
                disabled={createBill.isPending}
              >
                <QrCode className="h-4 w-4" />
                {lang === "hi" ? "UPI से तुरंत भुगतान" : "Pay via UPI QR"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmed Success Screen Modal */}
      {orderConfirmed && (
        <Dialog open={!!orderConfirmed} onOpenChange={() => setOrderConfirmed(null)}>
          <DialogContent className="max-w-xs text-center p-6 space-y-4">
            <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <DialogTitle className="text-xl font-bold text-slate-900">
                {lang === "hi" ? "ऑर्डर सफलतापूर्वक मिला!" : "Order Placed Successfully!"}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {lang === "hi"
                  ? "कृपया काउंटर पर यह टोकन नंबर दिखाकर अपना ताज़ा भोजन प्राप्त करें।"
                  : "Please show this token number at the counter to collect your fresh order."}
              </DialogDescription>
            </div>

            <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-4">
              <span className="text-xs uppercase tracking-widest text-slate-500 font-medium block">
                {lang === "hi" ? "आपका टोकन नंबर" : "YOUR TOKEN NUMBER"}
              </span>
              <span className="text-4xl font-extrabold text-orange-600 tracking-wider block mt-1">
                #{String(orderConfirmed.billNumber).padStart(4, "0")}
              </span>
            </div>

            <div className="text-xs text-muted-foreground">
              Total Amount: <span className="font-bold text-slate-900">{formatRupee(orderConfirmed.total)}</span> (
              {orderConfirmed.paymentMode})
            </div>

            <Button
              className="w-full bg-slate-900 hover:bg-slate-800 text-xs"
              onClick={() => setOrderConfirmed(null)}
            >
              {lang === "hi" ? "नया ऑर्डर करें" : "Place Another Order"}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
