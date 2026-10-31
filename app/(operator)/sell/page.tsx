"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  QrCode,
  Share2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { soundbox } from "@/lib/soundbox";
import { offlineStorage } from "@/lib/offline-storage";
import { whatsappService } from "@/lib/whatsapp";
import QRCode from "qrcode";

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
  const [upiRef, setUpiRef] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [orderChannel, setOrderChannel] = useState<"WALK_IN" | "SWIGGY" | "ZOMATO" | "PHONE">("WALK_IN");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);

  // Soundbox & Offline states
  const [soundboxOn, setSoundboxOn] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  // Dynamic UPI QR states
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Last bill generated (for WhatsApp share)
  const [lastCreatedBill, setLastCreatedBill] = useState<any>(null);

  const items = trpc.item.listSellable.useQuery();
  const profile = trpc.user.getProfile.useQuery();
  const kioskId = profile.data?.assignedKiosk?.id;

  const kioskMenu = trpc.kiosk.getPublicMenu.useQuery(
    { kioskId: kioskId! },
    { enabled: !!kioskId }
  );

  const activeRules = trpc.dynamicPricing.getActiveRules.useQuery(
    { kioskId: kioskId },
    { enabled: !!kioskId }
  );

  const customerLookup = trpc.customer.findByPhone.useQuery(
    { phone: customerPhone },
    { enabled: customerPhone.length === 10 }
  );

  const stampCard = trpc.loyalty.getStampCard.useQuery(
    { phone: customerPhone },
    { enabled: customerPhone.length === 10 }
  );

  const recordStamp = trpc.loyalty.recordStamp.useMutation();
  const redeemReward = trpc.loyalty.redeemReward.useMutation();
  const createCustomer = trpc.customer.create.useMutation();
  const addPoints = trpc.customer.addPoints.useMutation();

  const createBill = trpc.billing.create.useMutation({
    onSuccess: async (bill) => {
      // Announce payment on soundbox if UPI
      if (paymentMode === "UPI" || paymentMode === "MIXED") {
        soundbox.announcePayment(bill.total);
      }

      // Record loyalty points & stamps
      if (customerPhone.length === 10) {
        try {
          await recordStamp.mutateAsync({ phone: customerPhone });
        } catch {}
      }

      if (customerLookup.data) {
        try {
          await addPoints.mutateAsync({
            customerId: customerLookup.data.id,
            billAmount: bill.total,
          });
        } catch {}
      } else if (customerPhone.length === 10) {
        try {
          const customer = await createCustomer.mutateAsync({ phone: customerPhone });
          await addPoints.mutateAsync({
            customerId: customer.id,
            billAmount: bill.total,
          });
        } catch {}
      }

      setLastCreatedBill({
        ...bill,
        customerPhone,
        kioskName: profile.data?.assignedKiosk?.name || "Kiosk Counter",
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          price: c.unitPrice,
          total: c.unitPrice * c.quantity,
        })),
      });

      setCart([]);
      setUpiRef("");
      setCashAmount("");
      setUpiAmount("");
      setCustomerPhone("");
      setShowCustomer(false);
      setShowUpiModal(false);
      toast.success("Bill created successfully!");
    },
    onError: (err) => toast.error(err.message),
  });

  // Offline / Online monitoring
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setOfflinePendingCount(offlineStorage.getPendingCount());
    setSoundboxOn(soundbox.isEnabled());

    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Network restored! Syncing offline bills...");
      syncOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Network disconnected. Running in Offline Mode.");
    };

    const handleQueueUpdate = (e: any) => {
      setOfflinePendingCount(e.detail || offlineStorage.getPendingCount());
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("kiosk_offline_queue_updated", handleQueueUpdate);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("kiosk_offline_queue_updated", handleQueueUpdate);
    };
  }, []);

  const syncOfflineQueue = async () => {
    const queue = offlineStorage.getQueue();
    if (queue.length === 0) return;

    for (const b of queue) {
      try {
        await createBill.mutateAsync({
          kioskId: b.kioskId,
          date: new Date(b.timestamp),
          paymentMode: b.paymentMode,
          upiTransactionRef: b.upiRef,
          cashAmount: b.cashAmount,
          upiAmount: b.upiAmount,
          customerPhone: b.customerPhone,
          orderChannel: (b.orderChannel as any) || "WALK_IN",
          items: b.items,
        });
        offlineStorage.removeBill(b.localId);
      } catch (err) {
        console.error("Failed syncing bill", b.localId, err);
        break; // retry next cycle
      }
    }
    setOfflinePendingCount(offlineStorage.getPendingCount());
  };

  const toggleSoundbox = () => {
    const nextState = !soundboxOn;
    soundbox.setEnabled(nextState);
    setSoundboxOn(nextState);
    toast.info(nextState ? "Soundbox Audio ON (Hindi Voice)" : "Soundbox Audio Muted");
  };

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

  const generateUpiQr = async () => {
    const vpa = profile.data?.assignedKiosk?.upiId || "kiosk.pos@upi";
    const name = profile.data?.assignedKiosk?.name || "Kiosk ERP";
    const upiString = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(
      name
    )}&am=${total}&cu=INR`;

    try {
      const url = await QRCode.toDataURL(upiString, { width: 260, margin: 1 });
      setQrCodeDataUrl(url);
      setShowUpiModal(true);
    } catch {
      toast.error("Failed to generate UPI QR code");
    }
  };

  const handleCreateBill = () => {
    if (cart.length === 0 || !profile.data?.assignedKiosk) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billPayload = {
      kioskId: profile.data.assignedKiosk.id,
      paymentMode,
      upiRef: upiRef || undefined,
      cashAmount: cashAmount ? parseFloat(cashAmount) : undefined,
      upiAmount: upiAmount ? parseFloat(upiAmount) : undefined,
      orderChannel,
      customerPhone: customerPhone || undefined,
      total,
      items: cart.map((c) => ({
        itemId: c.itemId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
    };

    // If offline, store locally in offlineStorage queue
    if (!navigator.onLine) {
      offlineStorage.saveBill(billPayload);
      if (paymentMode === "UPI" || paymentMode === "MIXED") {
        soundbox.announcePayment(total);
      }
      setCart([]);
      setUpiRef("");
      setCashAmount("");
      setUpiAmount("");
      setCustomerPhone("");
      setShowCustomer(false);
      setShowUpiModal(false);
      toast.success("Bill saved locally in Offline Queue!");
      return;
    }

    createBill.mutate({
      kioskId: profile.data.assignedKiosk.id,
      date: today,
      paymentMode,
      upiTransactionRef: upiRef || undefined,
      cashAmount: cashAmount ? parseFloat(cashAmount) : undefined,
      upiAmount: upiAmount ? parseFloat(upiAmount) : undefined,
      orderChannel,
      customerPhone: customerPhone || undefined,
      customerId: customerLookup.data?.id,
      items: billPayload.items,
    });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Top Bar with Online/Offline & Soundbox Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold">Sell</h1>
          {isOnline ? (
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-300 text-[11px] gap-1">
              <Wifi className="h-3 w-3" /> Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[11px] gap-1 animate-pulse">
              <WifiOff className="h-3 w-3" /> Offline Mode
            </Badge>
          )}

          {offlinePendingCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] border-amber-400 bg-amber-50 text-amber-800"
              onClick={syncOfflineQueue}
            >
              Sync {offlinePendingCount} pending
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 rounded-full ${soundboxOn ? "text-orange-600 bg-orange-50" : "text-muted-foreground"}`}
            onClick={toggleSoundbox}
            title={soundboxOn ? "Soundbox Audio Active" : "Soundbox Audio Muted"}
          >
            {soundboxOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          <Select value={orderChannel} onValueChange={(v) => setOrderChannel(v as any)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="WALK_IN">Walk-in</SelectItem>
              <SelectItem value="SWIGGY">Swiggy</SelectItem>
              <SelectItem value="ZOMATO">Zomato</SelectItem>
              <SelectItem value="PHONE">Phone</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Dynamic Pricing Banner */}
      {activeRules.data && activeRules.data.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-lg p-2.5 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span>{activeRules.data[0].name}</span>
          </div>
          <Badge className="bg-amber-600 text-white font-bold text-[10px]">
            {activeRules.data[0].discountPercent > 0
              ? `-${activeRules.data[0].discountPercent}% OFF`
              : `+${Math.abs(activeRules.data[0].discountPercent)}% SURGE`}
          </Badge>
        </div>
      )}

      {/* Item Grid */}
      {items.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.data?.map((item: any) => {
            const inCart = cart.find((c) => c.itemId === item.id);
            const is86ed = kioskMenu.data?.items?.find((ki: any) => ki.id === item.id)?.is86ed || false;
            return (
              <button
                key={item.id}
                disabled={is86ed}
                onClick={() => !is86ed && addToCart(item)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  is86ed
                    ? "opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed"
                    : inCart
                    ? "border-orange-500 bg-orange-50 active:scale-95"
                    : "border-gray-200 bg-white hover:border-gray-300 active:scale-95"
                }`}
              >
                <div className="flex justify-between items-start gap-1">
                  <p className="font-medium text-sm leading-tight">{item.name}</p>
                  {is86ed && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0 font-bold shrink-0">
                      86 OUT
                    </Badge>
                  )}
                </div>
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

            {/* UPI Dynamic QR Launcher */}
            {(paymentMode === "UPI" || paymentMode === "MIXED") && (
              <div className="flex gap-2">
                <Input
                  placeholder="UPI Transaction Ref (Optional)"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="text-sm flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={generateUpiQr}
                  className="gap-1 text-xs shrink-0"
                >
                  <QrCode className="h-3.5 w-3.5" /> Show QR
                </Button>
              </div>
            )}

            {/* Mixed amounts */}
            {paymentMode === "MIXED" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cash (₹)</Label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label className="text-xs">UPI (₹)</Label>
                  <Input
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {/* Customer loyalty & WhatsApp receipt */}
            <div>
              <button
                onClick={() => setShowCustomer(!showCustomer)}
                className="text-xs text-blue-600 flex items-center gap-1 font-medium"
              >
                <User className="h-3 w-3" />
                {showCustomer ? "Hide" : "Add"} customer for loyalty & WhatsApp e-bill
              </button>
              {showCustomer && (
                <div className="mt-2">
                  <Input
                    placeholder="Customer phone (10 digits)"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    className="text-sm"
                  />
                  {customerPhone.length === 10 && stampCard.data && (
                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-amber-950 flex items-center gap-1">
                          ☕ Chai Club Digital Passbook
                        </span>
                        <span className="font-mono text-amber-800 text-sm font-bold">
                          {"⭐".repeat(stampCard.data.stampsCount)}{"⚪".repeat(5 - stampCard.data.stampsCount)} ({stampCard.data.stampsCount}/5)
                        </span>
                      </div>
                      {stampCard.data.freeChaisAvailable > 0 && (
                        <div className="flex justify-between items-center pt-1 border-t border-amber-200">
                          <span className="font-semibold text-emerald-800">
                            🎁 {stampCard.data.freeChaisAvailable} Free Chai Available
                          </span>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                            onClick={() => {
                              redeemReward.mutate(
                                { phone: customerPhone },
                                {
                                  onSuccess: () => {
                                    toast.success("1 Free Chai claimed!");
                                    stampCard.refetch();
                                  },
                                  onError: (err: any) => toast.error(err.message),
                                }
                              );
                            }}
                            disabled={redeemReward.isPending}
                          >
                            Claim Free Chai
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  {customerLookup.data && (
                    <p className="text-xs text-green-600 mt-1">
                      {customerLookup.data.name || "Customer"} — {customerLookup.data.loyaltyPts} pts
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Total and submit */}
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-orange-600">{formatRupee(total)}</span>
            </div>
            <Button
              className="w-full h-14 text-lg bg-orange-600 hover:bg-orange-700 font-bold"
              onClick={handleCreateBill}
              disabled={createBill.isPending}
            >
              {createBill.isPending ? "Saving..." : `Save Bill - ${formatRupee(total)}`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dynamic Counter UPI QR Modal */}
      <Dialog open={showUpiModal} onOpenChange={setShowUpiModal}>
        <DialogContent className="max-w-xs text-center p-6 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Scan to Pay via UPI</DialogTitle>
            <DialogDescription className="text-xs">
              Show this QR code to customer on counter
            </DialogDescription>
          </DialogHeader>

          {qrCodeDataUrl ? (
            <div className="bg-white p-3 rounded-xl border-2 border-orange-500 shadow-md inline-block mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeDataUrl} alt="UPI QR" className="h-52 w-52 mx-auto" />
            </div>
          ) : (
            <div className="h-52 w-52 flex items-center justify-center text-xs text-muted-foreground">
              Generating QR...
            </div>
          )}

          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-orange-600 block">{formatRupee(total)}</span>
            <span className="text-xs text-muted-foreground block font-mono">
              {profile.data?.assignedKiosk?.upiId || "kiosk@upi"}
            </span>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
            onClick={handleCreateBill}
          >
            Payment Received & Complete
          </Button>
        </DialogContent>
      </Dialog>

      {/* WhatsApp E-Bill Success Drawer / Share button */}
      {lastCreatedBill && lastCreatedBill.customerPhone && (
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-lg flex justify-between items-center text-xs">
          <div>
            <span className="font-bold text-emerald-900 block">Bill #{lastCreatedBill.billNumber} Saved!</span>
            <span className="text-emerald-700">Customer: +91 {lastCreatedBill.customerPhone}</span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100 h-8 font-semibold"
              onClick={() => {
                const message = `☕ *${lastCreatedBill.kioskName} — Chai Club Passbook* ☕\n\n` +
                  `Thank you for your visit today!\n` +
                  `Your bill #${lastCreatedBill.billNumber} (${formatRupee(lastCreatedBill.total)}) has earned you another digital stamp.\n` +
                  `Collect 5 stamps to claim your next FREE cutting chai!`;
                window.open(`https://wa.me/91${lastCreatedBill.customerPhone}?text=${encodeURIComponent(message)}`, "_blank");
              }}
            >
              ☕ Send Stamp Passbook
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1.5 h-8 font-semibold"
              onClick={() => {
                const text = whatsappService.formatCustomerEBill({
                  billNumber: lastCreatedBill.billNumber,
                  kioskName: lastCreatedBill.kioskName,
                  date: new Date().toLocaleDateString("en-IN"),
                  items: lastCreatedBill.items,
                  subtotal: lastCreatedBill.subtotal || lastCreatedBill.total,
                  discount: lastCreatedBill.discount || 0,
                  gstAmount: lastCreatedBill.tax || 0,
                  total: lastCreatedBill.total,
                  paymentMode: lastCreatedBill.paymentMode,
                });
                const link = whatsappService.createWhatsAppLink(lastCreatedBill.customerPhone, text);
                window.open(link, "_blank");
              }}
            >
              <Share2 className="h-3.5 w-3.5" /> Send E-Bill
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
