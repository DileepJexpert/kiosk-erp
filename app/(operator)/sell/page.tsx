"use client";

import { useState, useEffect, useRef } from "react";
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
  Printer,
  PauseCircle,
  PlayCircle,
  Search,
  Sparkles,
  SlidersHorizontal,
  Check,
  UtensilsCrossed,
  Receipt,
  Keyboard,
} from "lucide-react";
import { toast } from "sonner";
import { soundbox } from "@/lib/soundbox";
import { offlineStorage } from "@/lib/offline-storage";
import { whatsappService } from "@/lib/whatsapp";
import {
  printThermalRaw,
  generateKOTPrintText,
  generateReceiptPrintText,
  ThermalItem,
} from "@/lib/printer-thermal";
import QRCode from "qrcode";

interface ModifierOption {
  name: string;
  price: number;
}

interface CartItem {
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  modifiers?: ModifierOption[];
  notes?: string;
}

interface HeldBill {
  id: string;
  label: string;
  savedAt: string;
  cart: CartItem[];
  orderType: "DINE_IN" | "TAKEAWAY" | "DELIVERY";
  customerPhone?: string;
}

export default function SellPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "MIXED">("CASH");
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEAWAY" | "DELIVERY">("DINE_IN");
  const [upiRef, setUpiRef] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [orderChannel, setOrderChannel] = useState<"WALK_IN" | "SWIGGY" | "ZOMATO" | "PHONE">("WALK_IN");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomer, setShowCustomer] = useState(false);

  // Search & Keyboard
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cash Tender Calculator Modal
  const [showCashModal, setShowCashModal] = useState(false);
  const [tenderReceived, setTenderReceived] = useState<string>("");

  // Modifiers Modal
  const [customizingItem, setCustomizingItem] = useState<any | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<ModifierOption[]>([]);
  const [itemNote, setItemNote] = useState("");

  // Park / Hold Bills
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Auto-Print Settings
  const [autoPrintKOT, setAutoPrintKOT] = useState(false);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  // Soundbox & Offline states
  const [soundboxOn, setSoundboxOn] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [offlinePendingCount, setOfflinePendingCount] = useState(0);

  // Dynamic UPI QR states
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  // Last bill generated (for printing & WhatsApp share)
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

  // Load held bills and preferences from localStorage
  useEffect(() => {
    try {
      const savedHeld = localStorage.getItem(`kiosk_held_bills_${kioskId || "default"}`);
      if (savedHeld) setHeldBills(JSON.parse(savedHeld));

      const savedKOTPref = localStorage.getItem("kiosk_autoprint_kot");
      if (savedKOTPref !== null) setAutoPrintKOT(savedKOTPref === "true");

      const savedReceiptPref = localStorage.getItem("kiosk_autoprint_receipt");
      if (savedReceiptPref !== null) setAutoPrintReceipt(savedReceiptPref === "true");
    } catch {}
  }, [kioskId]);

  const saveHeldBills = (updated: HeldBill[]) => {
    setHeldBills(updated);
    try {
      localStorage.setItem(`kiosk_held_bills_${kioskId || "default"}`, JSON.stringify(updated));
    } catch {}
  };

  const createBill = trpc.billing.create.useMutation({
    onSuccess: async (bill) => {
      // Soundbox alert
      if (paymentMode === "UPI" || paymentMode === "MIXED") {
        soundbox.announcePayment(bill.total);
      }

      // Record loyalty stamps
      if (customerPhone.length === 10) {
        try {
          await recordStamp.mutateAsync({ phone: customerPhone });
        } catch {}
      }

      const billRecord = {
        ...bill,
        customerPhone,
        kioskName: profile.data?.assignedKiosk?.name || "Kiosk Counter",
        location: profile.data?.assignedKiosk?.location,
        gstin: profile.data?.assignedKiosk?.gstin,
        fssai: profile.data?.assignedKiosk?.fssaiNumber,
        items: cart.map((c) => ({
          name: c.name,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          lineTotal:
            c.quantity *
            (c.unitPrice + (c.modifiers?.reduce((s, m) => s + m.price, 0) || 0)),
          modifiers: c.modifiers,
          notes: c.notes,
        })),
        tenderAmount: parseFloat(tenderReceived) || undefined,
        changeReturned:
          parseFloat(tenderReceived) > bill.total
            ? parseFloat(tenderReceived) - bill.total
            : undefined,
      };

      setLastCreatedBill(billRecord);

      // Auto-print thermal slips
      if (autoPrintKOT) {
        printKOTSlip(billRecord);
      }
      if (autoPrintReceipt) {
        printCustomerReceiptSlip(billRecord);
      }

      setCart([]);
      setUpiRef("");
      setCashAmount("");
      setUpiAmount("");
      setTenderReceived("");
      setCustomerPhone("");
      setShowCustomer(false);
      setShowUpiModal(false);
      setShowCashModal(false);
      toast.success(`Bill #${bill.billNumber} Punched!`);
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
        break;
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

  // High-Speed Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isInput = tag === "input" || tag === "textarea" || tag === "select";

      // F2 or Alt+C -> Cash Tender
      if (e.key === "F2" || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        if (cart.length > 0) {
          setPaymentMode("CASH");
          setShowCashModal(true);
        }
        return;
      }

      // F4 or Alt+U -> UPI QR
      if (e.key === "F4" || (e.altKey && e.key.toLowerCase() === "u")) {
        e.preventDefault();
        if (cart.length > 0) {
          setPaymentMode("UPI");
          generateUpiQr();
        }
        return;
      }

      // F8 -> Hold/Park Bill
      if (e.key === "F8") {
        e.preventDefault();
        handleHoldCurrentBill();
        return;
      }

      // F9 -> View Parked Bills
      if (e.key === "F9") {
        e.preventDefault();
        setShowHeldModal(true);
        return;
      }

      // Space or '/' when not typing -> focus search
      if (!isInput && (e.key === "/" || e.key === " ")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Esc -> close dialogs
      if (e.key === "Escape") {
        setShowCashModal(false);
        setShowUpiModal(false);
        setShowHeldModal(false);
        setCustomizingItem(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, heldBills]);

  const addToCart = (
    item: { id: string; name: string; sellPrice: number; unit: string },
    modifiers?: ModifierOption[],
    note?: string
  ) => {
    setCart((prev) => {
      // Find existing with same item and identical modifiers
      const existing = prev.find(
        (c) =>
          c.itemId === item.id &&
          JSON.stringify(c.modifiers || []) === JSON.stringify(modifiers || [])
      );
      if (existing) {
        return prev.map((c) =>
          c === existing ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          itemId: item.id,
          name: item.name,
          unitPrice: item.sellPrice,
          quantity: 1,
          unit: item.unit,
          modifiers: modifiers || [],
          notes: note,
        },
      ];
    });
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c, i) => (i === index ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const total = cart.reduce((sum, item) => {
    const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) || 0;
    return sum + (item.unitPrice + modTotal) * item.quantity;
  }, 0);

  // Park / Hold current bill
  const handleHoldCurrentBill = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty. Nothing to park!");
      return;
    }
    const newHeld: HeldBill = {
      id: "HELD-" + Date.now().toString().slice(-6),
      label: `Order ${heldBills.length + 1} (${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })})`,
      savedAt: new Date().toLocaleTimeString("en-IN"),
      cart: [...cart],
      orderType,
      customerPhone: customerPhone || undefined,
    };
    saveHeldBills([...heldBills, newHeld]);
    setCart([]);
    setCustomerPhone("");
    toast.success(`Bill parked! [F9 to recall]`);
  };

  // Restore parked bill
  const handleRestoreHeldBill = (held: HeldBill) => {
    if (cart.length > 0) {
      // Auto-hold active cart first
      saveHeldBills([
        ...heldBills.filter((h) => h.id !== held.id),
        {
          id: "HELD-" + Date.now().toString().slice(-6),
          label: `Previous Active Order`,
          savedAt: new Date().toLocaleTimeString("en-IN"),
          cart: [...cart],
          orderType,
          customerPhone: customerPhone || undefined,
        },
      ]);
    } else {
      saveHeldBills(heldBills.filter((h) => h.id !== held.id));
    }
    setCart(held.cart);
    setOrderType(held.orderType);
    setCustomerPhone(held.customerPhone || "");
    setShowHeldModal(false);
    toast.success(`Restored ${held.label}`);
  };

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

  const handleCommitSale = (selectedMode: "CASH" | "UPI" | "MIXED") => {
    if (cart.length === 0 || !profile.data?.assignedKiosk) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billPayload = {
      kioskId: profile.data.assignedKiosk.id,
      date: today,
      paymentMode: selectedMode,
      orderType,
      tenderAmount: parseFloat(tenderReceived) || undefined,
      changeReturned:
        parseFloat(tenderReceived) > total ? parseFloat(tenderReceived) - total : undefined,
      upiTransactionRef: upiRef || undefined,
      cashAmount: cashAmount ? parseFloat(cashAmount) : undefined,
      upiAmount: upiAmount ? parseFloat(upiAmount) : undefined,
      orderChannel,
      customerPhone: customerPhone || undefined,
      customerId: customerLookup.data?.id,
      items: cart.map((c) => ({
        itemId: c.itemId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
        modifiers: c.modifiers,
        notes: c.notes,
      })),
    };

    if (!navigator.onLine) {
      offlineStorage.saveBill(billPayload as any);
      toast.success("Bill saved in Offline Queue!");
      setCart([]);
      setShowCashModal(false);
      setShowUpiModal(false);
      return;
    }

    createBill.mutate(billPayload);
  };

  const printKOTSlip = (billData: any) => {
    const rawKOT = generateKOTPrintText({
      kioskName: billData.kioskName || "Kiosk Counter",
      tokenNumber: String(billData.billNumber).padStart(4, "0"),
      billNumber: billData.billNumber,
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      orderType: billData.orderType || "DINE_IN",
      operatorName: profile.data?.name,
      items: billData.items,
    });
    printThermalRaw(rawKOT, `KOT-${billData.billNumber}`);
  };

  const printCustomerReceiptSlip = (billData: any) => {
    const rawReceipt = generateReceiptPrintText({
      kioskName: billData.kioskName || "Kiosk Counter",
      location: billData.location,
      gstin: billData.gstin,
      fssai: billData.fssai,
      billNumber: billData.billNumber,
      tokenNumber: String(billData.billNumber).padStart(4, "0"),
      date: new Date().toLocaleDateString("en-IN"),
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      orderType: billData.orderType || "DINE_IN",
      paymentMode: billData.paymentMode,
      operatorName: profile.data?.name,
      customerPhone: billData.customerPhone,
      items: billData.items,
      subtotal: billData.subtotal || billData.total,
      cgst: billData.cgstAmount || 0,
      sgst: billData.sgstAmount || 0,
      total: billData.total,
      tenderAmount: billData.tenderAmount,
      changeReturned: billData.changeReturned,
    });
    printThermalRaw(rawReceipt, `Receipt-${billData.billNumber}`);
  };

  // Filter items by search
  const filteredItems = items.data?.filter((item: any) => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Sample default modifier presets based on category
  const getModifiersForItem = (item: any): ModifierOption[] => {
    if (item.category === "BEVERAGE") {
      return [
        { name: "Less Sugar", price: 0 },
        { name: "No Sugar", price: 0 },
        { name: "Adrak / Ginger", price: 5 },
        { name: "Elaichi", price: 5 },
        { name: "Kulhad Cup", price: 5 },
      ];
    }
    return [
      { name: "Extra Spicy", price: 0 },
      { name: "No Onion / Jain", price: 0 },
      { name: "Extra Cheese", price: 20 },
      { name: "Extra Butter", price: 15 },
      { name: "Extra Pav", price: 15 },
    ];
  };

  const changeDue = Math.max(0, (parseFloat(tenderReceived) || 0) - total);

  return (
    <div className="space-y-3 pb-6">
      {/* Top Operations Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-amber-500/20 text-amber-400 rounded-lg flex items-center justify-center font-bold text-sm">
            ⚡
          </div>
          <div>
            <h1 className="font-extrabold text-sm leading-none flex items-center gap-1.5">
              SPEED POS COUNTER
              {isOnline ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-red-400 inline-block animate-ping" />
              )}
            </h1>
            <span className="text-[10px] text-slate-400 font-mono">
              F2 Cash • F4 UPI • F8 Park • Space Search
            </span>
          </div>
        </div>

        {/* Order Channel & Parked Bills Drawer Button */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 gap-1.5 font-bold"
            onClick={() => setShowHeldModal(true)}
          >
            <PauseCircle className="h-3.5 w-3.5" />
            Parked ({heldBills.length}) [F9]
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 rounded-md ${
              soundboxOn ? "text-amber-400 bg-slate-800" : "text-slate-500"
            }`}
            onClick={toggleSoundbox}
            title={soundboxOn ? "Soundbox Audio ON" : "Soundbox Muted"}
          >
            {soundboxOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          <Select value={orderChannel} onValueChange={(v) => setOrderChannel(v as any)}>
            <SelectTrigger className="w-24 h-7 text-[11px] bg-slate-800 border-slate-700 text-slate-200">
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

      {/* Item Instant Search & Order Type Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Type item or press Space to search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Order Type Toggle: DINE-IN vs TAKEAWAY vs DELIVERY */}
        <div className="flex bg-slate-100 p-0.5 rounded-lg border text-xs shrink-0">
          <button
            onClick={() => setOrderType("DINE_IN")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              orderType === "DINE_IN"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Dine-In
          </button>
          <button
            onClick={() => setOrderType("TAKEAWAY")}
            className={`px-3 py-1.5 rounded-md font-bold transition-all ${
              orderType === "TAKEAWAY"
                ? "bg-amber-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Takeaway
          </button>
        </div>
      </div>

      {/* Dynamic Pricing Alert */}
      {activeRules.data && activeRules.data.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-900 rounded-lg p-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            <span>{activeRules.data[0].name} (Live)</span>
          </div>
          <Badge className="bg-amber-600 text-white font-bold text-[10px]">
            {activeRules.data[0].discountPercent > 0
              ? `-${activeRules.data[0].discountPercent}% OFF`
              : `+${Math.abs(activeRules.data[0].discountPercent)}% SURGE`}
          </Badge>
        </div>
      )}

      {/* Main Grid: Items & High-Velocity Cart */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Left: Menu Items */}
        <div className="md:col-span-7 space-y-2">
          {items.isLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto pr-1">
              {filteredItems?.map((item: any) => {
                const inCart = cart.filter((c) => c.itemId === item.id);
                const totalInCart = inCart.reduce((s, c) => s + c.quantity, 0);
                const is86ed =
                  kioskMenu.data?.items?.find((ki: any) => ki.id === item.id)?.is86ed || false;

                return (
                  <div
                    key={item.id}
                    className={`relative p-3 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                      is86ed
                        ? "opacity-50 bg-slate-100 border-slate-200 cursor-not-allowed"
                        : totalInCart > 0
                        ? "border-orange-500 bg-orange-50/50 shadow-xs"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <p className="font-bold text-xs text-slate-900 leading-tight">
                          {item.name}
                        </p>
                        {is86ed && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0 font-bold shrink-0">
                            86 OUT
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-black text-orange-600 mt-1 font-mono">
                        {formatRupee(item.sellPrice)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <Button
                        size="sm"
                        disabled={is86ed}
                        className="flex-1 h-7 text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold"
                        onClick={() => !is86ed && addToCart(item)}
                      >
                        + Add
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        disabled={is86ed}
                        className="h-7 w-7 border-slate-300 text-slate-700 hover:bg-slate-100"
                        title="Customize / Add Modifiers"
                        onClick={() => {
                          setCustomizingItem(item);
                          setSelectedModifiers([]);
                          setItemNote("");
                        }}
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-orange-600" />
                      </Button>
                    </div>

                    {totalInCart > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[11px] font-black h-5 w-5 rounded-full flex items-center justify-center shadow-xs">
                        {totalInCart}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Active Cart */}
        <div className="md:col-span-5">
          <Card className="border-2 border-orange-300 shadow-sm sticky top-2">
            <CardContent className="p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                  <span className="font-bold text-xs text-slate-900">
                    Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] text-amber-700 hover:bg-amber-50 px-2 font-bold"
                    onClick={handleHoldCurrentBill}
                    title="Park Current Bill (F8)"
                  >
                    <PauseCircle className="h-3 w-3 mr-1" /> Park (F8)
                  </Button>
                  {cart.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] text-red-600 hover:bg-red-50 px-1"
                      onClick={() => setCart([])}
                      title="Clear Cart"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {/* Items List */}
              {cart.length === 0 ? (
                <div className="text-center py-10 space-y-1">
                  <p className="text-xs text-muted-foreground">Cart is empty</p>
                  <p className="text-[11px] text-slate-400">
                    Click items or press <kbd className="bg-slate-100 px-1 border rounded">Space</kbd> to search
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-1">
                  {cart.map((item, idx) => {
                    const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) || 0;
                    const linePrice = (item.unitPrice + modTotal) * item.quantity;

                    return (
                      <div key={idx} className="flex justify-between items-start py-1.5 border-b last:border-0 text-xs">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                          {item.modifiers && item.modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.modifiers.map((m, mIdx) => (
                                <span
                                  key={mIdx}
                                  className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 rounded"
                                >
                                  {m.name} {m.price > 0 ? `(+₹${m.price})` : ""}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-slate-400 italic">*{item.notes}</p>
                          )}
                          <p className="text-[11px] text-orange-600 font-mono font-bold mt-0.5">
                            {formatRupee(linePrice)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(idx, -1)}
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </Button>
                          <span className="w-5 text-center font-bold font-mono text-xs">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(idx, 1)}
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-500"
                            onClick={() => removeFromCart(idx)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total & Instant Action Buttons */}
              {cart.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-slate-600">Grand Total</span>
                    <span className="text-2xl font-black text-orange-600 font-mono">
                      {formatRupee(total)}
                    </span>
                  </div>

                  {/* Customer Phone Bar */}
                  <div className="flex gap-1.5">
                    <Input
                      placeholder="Customer phone (10 digits)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="h-8 text-xs font-mono"
                      maxLength={10}
                    />
                    {customerPhone.length === 10 && stampCard.data && (
                      <Badge className="bg-amber-600 text-[10px] text-white shrink-0">
                        ⭐ {stampCard.data.stampsCount}/5 Chais
                      </Badge>
                    )}
                  </div>

                  {/* 1-Click Fast Punch Buttons: Cash Tender vs UPI QR */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      className="h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 shadow-sm"
                      onClick={() => {
                        setPaymentMode("CASH");
                        setTenderReceived(String(total));
                        setShowCashModal(true);
                      }}
                      disabled={createBill.isPending}
                    >
                      💵 CASH [F2]
                    </Button>
                    <Button
                      className="h-11 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs gap-1 shadow-sm"
                      onClick={() => {
                        setPaymentMode("UPI");
                        generateUpiQr();
                      }}
                      disabled={createBill.isPending}
                    >
                      <QrCode className="h-4 w-4" /> UPI QR [F4]
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cash Tender Calculation Modal (F2) */}
      <Dialog open={showCashModal} onOpenChange={setShowCashModal}>
        <DialogContent className="max-w-sm p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              💵 High-Speed Cash Tender
            </DialogTitle>
            <DialogDescription className="text-xs">
              Calculate exact change return for customer instantly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="bg-slate-100 p-3 rounded-xl flex justify-between items-center font-mono">
              <span className="text-xs font-bold text-slate-600">Bill Total:</span>
              <span className="text-2xl font-black text-slate-900">{formatRupee(total)}</span>
            </div>

            {/* Quick Currency Tender Buttons */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">Quick Tender Presets</span>
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold font-mono h-8"
                  onClick={() => setTenderReceived(String(total))}
                >
                  Exact
                </Button>
                {[100, 200, 500].map((preset) => (
                  <Button
                    key={preset}
                    size="sm"
                    variant="outline"
                    className="text-xs font-bold font-mono h-8"
                    onClick={() => setTenderReceived(String(preset))}
                  >
                    ₹{preset}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cash Handed by Customer (₹)</Label>
              <Input
                type="number"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={tenderReceived}
                onChange={(e) => setTenderReceived(e.target.value)}
                className="h-10 text-lg font-black font-mono text-center"
              />
            </div>

            {/* Change Return Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">CHANGE TO RETURN</span>
                <span className="text-[10px] text-emerald-700">Hand back to customer</span>
              </div>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {formatRupee(changeDue)}
              </span>
            </div>

            <Button
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md"
              onClick={() => handleCommitSale("CASH")}
              disabled={createBill.isPending}
            >
              {createBill.isPending ? "Punching..." : "Punch & Complete Sale"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dynamic Counter UPI QR Modal (F4) */}
      <Dialog open={showUpiModal} onOpenChange={setShowUpiModal}>
        <DialogContent className="max-w-xs text-center p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Scan to Pay via UPI</DialogTitle>
            <DialogDescription className="text-xs">
              Customer scans counter QR
            </DialogDescription>
          </DialogHeader>

          {qrCodeDataUrl ? (
            <div className="bg-white p-2 rounded-xl border-2 border-orange-500 shadow-md inline-block mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCodeDataUrl} alt="UPI QR" className="h-48 w-48 mx-auto" />
            </div>
          ) : (
            <div className="h-48 w-48 flex items-center justify-center text-xs text-muted-foreground">
              Generating QR...
            </div>
          )}

          <div className="space-y-0.5">
            <span className="text-2xl font-extrabold text-orange-600 block font-mono">
              {formatRupee(total)}
            </span>
            <span className="text-[11px] text-muted-foreground block font-mono">
              {profile.data?.assignedKiosk?.upiId || "kiosk@upi"}
            </span>
          </div>

          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-bold h-10"
            onClick={() => handleCommitSale("UPI")}
            disabled={createBill.isPending}
          >
            Payment Received (F4)
          </Button>
        </DialogContent>
      </Dialog>

      {/* Parked / Held Bills Drawer (F9) */}
      <Dialog open={showHeldModal} onOpenChange={setShowHeldModal}>
        <DialogContent className="max-w-md p-5 space-y-3">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <PauseCircle className="h-5 w-5 text-amber-600" />
              Parked Orders ({heldBills.length})
            </DialogTitle>
            <DialogDescription className="text-xs">
              Orders temporarily held during rush hour. Click to restore immediately.
            </DialogDescription>
          </DialogHeader>

          {heldBills.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No parked orders. Press [F8] during a sale to hold an active cart.
            </p>
          ) : (
            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {heldBills.map((held) => {
                const heldTotal = held.cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
                return (
                  <div
                    key={held.id}
                    className="p-3 bg-slate-50 border rounded-xl flex justify-between items-center text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <span>{held.label}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1">
                          {held.orderType}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {held.cart.map((c) => `${c.quantity}x ${c.name}`).join(", ")}
                      </p>
                      <span className="text-xs font-bold text-orange-600 font-mono mt-0.5 block">
                        {formatRupee(heldTotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8 font-bold gap-1"
                        onClick={() => handleRestoreHeldBill(held)}
                      >
                        <PlayCircle className="h-3.5 w-3.5" /> Resume
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:bg-red-50"
                        onClick={() => saveHeldBills(heldBills.filter((h) => h.id !== held.id))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Item Modifiers Modal */}
      {customizingItem && (
        <Dialog open={!!customizingItem} onOpenChange={() => setCustomizingItem(null)}>
          <DialogContent className="max-w-sm p-5 space-y-3">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="h-4 w-4 text-orange-600" />
                Customize: {customizingItem.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select sugar preference, spices, or extra toppings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="space-y-1.5">
                <span className="font-semibold text-slate-700 block">Modifiers & Add-ons</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {getModifiersForItem(customizingItem).map((mod, idx) => {
                    const isSelected = selectedModifiers.some((m) => m.name === mod.name);
                    return (
                      <button
                        key={idx}
                        className={`p-2 rounded-lg border text-left font-semibold flex justify-between items-center transition-all ${
                          isSelected
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedModifiers(selectedModifiers.filter((m) => m.name !== mod.name));
                          } else {
                            setSelectedModifiers([...selectedModifiers, mod]);
                          }
                        }}
                      >
                        <span>{mod.name}</span>
                        {mod.price > 0 && (
                          <span className="font-mono text-[11px] font-bold">
                            +₹{mod.price}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Special Preparation Note</Label>
                <Input
                  placeholder="e.g. Serve piping hot, less ice..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <Button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 text-xs"
                onClick={() => {
                  addToCart(customizingItem, selectedModifiers, itemNote || undefined);
                  setCustomizingItem(null);
                }}
              >
                Add Customized Item
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bill Success & 1-Click Thermal Print Dock */}
      {lastCreatedBill && (
        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl flex flex-wrap justify-between items-center gap-2 text-xs">
          <div>
            <span className="font-bold text-emerald-950 block text-sm">
              Bill #{lastCreatedBill.billNumber} Punched!
            </span>
            <span className="text-emerald-700 text-[11px]">
              Total: {formatRupee(lastCreatedBill.total)} • Token #{String(lastCreatedBill.billNumber).padStart(4, "0")}
            </span>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-slate-400 bg-white hover:bg-slate-50 text-slate-900 font-bold h-8 gap-1"
              onClick={() => printKOTSlip(lastCreatedBill)}
            >
              <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" /> Print KOT
            </Button>
            <Button
              size="sm"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold h-8 gap-1"
              onClick={() => printCustomerReceiptSlip(lastCreatedBill)}
            >
              <Printer className="h-3.5 w-3.5 text-emerald-400" /> Print Bill
            </Button>
            {lastCreatedBill.customerPhone && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1 h-8 font-semibold text-white"
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
                <Share2 className="h-3.5 w-3.5" /> WhatsApp
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
