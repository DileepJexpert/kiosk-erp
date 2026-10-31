"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanReview } from "@/components/scan-review";
import {
  Camera,
  Mic,
  RefreshCw,
  Package,
  AlertTriangle,
  Loader2,
  PenLine,
  X,
  Trash2,
  ArrowRightLeft,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type EntryMode = null | "scan" | "voice" | "repeat" | "manual";

export default function MyStockPage() {
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [scanning, setScanning] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [reviewData, setReviewData] = useState<any>(null);
  const [repeatSupplierId, setRepeatSupplierId] = useState("");

  // Manual entry state
  const [manualSupplierId, setManualSupplierId] = useState("");
  const [manualItems, setManualItems] = useState<
    { itemId: string; quantity: number; unitPrice: number }[]
  >([]);

  // Auto-86 state
  const [showAuto86, setShowAuto86] = useState(false);

  // Waste logging state
  const [showWasteDialog, setShowWasteDialog] = useState(false);
  const [wasteItemId, setWasteItemId] = useState("");
  const [wasteQty, setWasteQty] = useState("");
  const [wasteReason, setWasteReason] = useState<
    "CURDLED_MILK" | "BURNT_PREP" | "DROPPED_DAMAGED" | "EXPIRED_SHELF_LIFE" | "PEST_DAMAGE"
  >("CURDLED_MILK");
  const [wastePhotoUrl, setWastePhotoUrl] = useState("");
  const [wasteNotes, setWasteNotes] = useState("");
  const wasteFileRef = useRef<HTMLInputElement>(null);

  // Transfer state
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferTargetKioskId, setTransferTargetKioskId] = useState("");
  const [transferItemId, setTransferItemId] = useState("");
  const [transferQty, setTransferQty] = useState("");
  const [acceptCode, setAcceptCode] = useState("");
  const [activeTransferCode, setActiveTransferCode] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const profile = trpc.user.getProfile.useQuery();
  const kioskId = profile.data?.assignedKiosk?.id;

  const todayPurchases = trpc.purchaseSmart.todayPurchases.useQuery();
  const lowStock = trpc.purchaseSmart.lowStockItems.useQuery();
  const suppliers = trpc.supplier.list.useQuery();
  const items = trpc.item.list.useQuery();

  const kioskMenu = trpc.kiosk.getPublicMenu.useQuery(
    { kioskId: kioskId! },
    { enabled: !!kioskId }
  );

  const otherKiosks = trpc.kiosk.list.useQuery();
  const transfers = trpc.stockTransfer.listKioskTransfers.useQuery(
    { kioskId: kioskId! },
    { enabled: !!kioskId }
  );

  const toggle86Mutation = trpc.kiosk.toggle86Item.useMutation({
    onSuccess: () => {
      toast.success("Item availability updated!");
      kioskMenu.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const logWasteMutation = trpc.waste.logWaste.useMutation({
    onSuccess: () => {
      toast.success("Food waste & photo logged for audit!");
      setShowWasteDialog(false);
      setWasteItemId("");
      setWasteQty("");
      setWastePhotoUrl("");
      setWasteNotes("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const requestTransferMutation = trpc.stockTransfer.createRequest.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Transfer code generated: ${data.transferCode}`);
      setActiveTransferCode(data.transferCode);
      transfers.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const acceptTransferMutation = trpc.stockTransfer.acceptTransfer.useMutation({
    onSuccess: () => {
      toast.success("Stock transfer confirmed & completed!");
      setAcceptCode("");
      transfers.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const scanBill = trpc.purchaseSmart.scanBill.useMutation({
    onSuccess: (data: any) => {
      setScanning(false);
      setReviewData(data);
    },
    onError: (err: any) => {
      setScanning(false);
      toast.error(err.message);
    },
  });

  const parseVoice = trpc.purchaseSmart.parseVoice.useMutation({
    onSuccess: (data: any) => {
      setListening(false);
      setReviewData(data);
    },
    onError: (err: any) => {
      setListening(false);
      toast.error(err.message);
    },
  });

  const repeatLast = trpc.purchaseSmart.repeatLast.useQuery(
    { supplierId: repeatSupplierId },
    { enabled: !!repeatSupplierId }
  );

  const saveSmart = trpc.purchaseSmart.saveSmart.useMutation({
    onSuccess: (data: any) => {
      toast.success("Purchase saved! Stock updated.");
      setReviewData(null);
      setEntryMode(null);
      setManualItems([]);
      todayPurchases.refetch();
      lowStock.refetch();
      if (data.suggestTemplate) {
        toast("Tip: Save this as a template for quick reorder next time!", {
          duration: 5000,
        });
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Photo capture for purchase bill
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setEntryMode("scan");

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      scanBill.mutate({ imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Photo capture for waste
  const handleWastePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setWastePhotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Voice entry for purchase
  const startVoice = () => {
    setEntryMode("voice");
    setListening(true);
    setTranscript("");

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser");
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let current = "";
      for (let i = 0; i < event.results.length; i++) {
        current += event.results[i][0].transcript;
      }
      setTranscript(current);
    };

    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice recognition error");
    };

    recognition.onend = () => {
      setListening(false);
      if (transcript) {
        parseVoice.mutate({ transcript });
      }
    };

    recognition.start();
  };

  const handleReviewSave = (data: any) => {
    saveSmart.mutate(data);
  };

  const handleRepeatSelect = (supplierId: string) => {
    setRepeatSupplierId(supplierId);
  };

  const handleManualSave = () => {
    if (!manualSupplierId || manualItems.length === 0) {
      toast.error("Select a supplier and add at least one item");
      return;
    }
    const validItems = manualItems.filter(
      (i) => i.itemId && i.quantity > 0 && i.unitPrice > 0
    );
    if (validItems.length === 0) {
      toast.error("Fill in all item details");
      return;
    }

    saveSmart.mutate({
      supplierId: manualSupplierId,
      date: new Date(),
      items: validItems.map((i) => ({
        itemId: i.itemId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      entryMethod: "MANUAL",
    });
  };

  const handleLogWasteSubmit = () => {
    if (!kioskId || !wasteItemId || !wasteQty) {
      toast.error("Please select an item and enter the wasted quantity");
      return;
    }
    logWasteMutation.mutate({
      kioskId,
      itemId: wasteItemId,
      quantity: parseFloat(wasteQty),
      reason: wasteReason,
      photoUrl: wastePhotoUrl || undefined,
      notes: wasteNotes || undefined,
    });
  };

  const handleRequestTransferSubmit = () => {
    if (!kioskId || !transferTargetKioskId || !transferItemId || !transferQty) {
      toast.error("Please fill in target kiosk, item, and quantity");
      return;
    }
    requestTransferMutation.mutate({
      targetKioskId: kioskId,
      sourceKioskId: transferTargetKioskId,
      itemId: transferItemId,
      quantity: parseFloat(transferQty),
    });
  };

  const items86edCount =
    kioskMenu.data?.items?.filter((i: any) => i.is86ed).length || 0;

  // Review mode
  if (reviewData) {
    return (
      <div className="space-y-4 pb-4">
        <h1 className="text-xl font-bold">Review Extracted Items</h1>
        <ScanReview
          items={reviewData.extracted.items || []}
          priceAlerts={reviewData.priceAlerts || []}
          supplierName={reviewData.extracted.supplier?.name}
          supplierMatchedId={reviewData.extracted.supplier?.matchedId}
          grandTotal={reviewData.extracted.grandTotal || 0}
          isDuplicate={reviewData.isDuplicate || false}
          inventoryItems={
            items.data?.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit })) || []
          }
          suppliers={
            suppliers.data?.map((s: any) => ({ id: s.id, name: s.name })) || []
          }
          onSave={handleReviewSave}
          onCancel={() => {
            setReviewData(null);
            setEntryMode(null);
          }}
          saving={saveSmart.isPending}
        />
      </div>
    );
  }

  // Repeat last mode
  if (entryMode === "repeat" && repeatLast.data) {
    return (
      <div className="space-y-4 pb-4">
        <h1 className="text-xl font-bold">Repeat Purchase</h1>
        <p className="text-sm text-muted-foreground">
          From: {repeatLast.data.supplier.name} — Last order{" "}
          {new Date(repeatLast.data.date).toLocaleDateString("en-IN")}
        </p>
        <ScanReview
          items={repeatLast.data.items.map((i: any) => ({
            rawText: i.item.name,
            matchedItemId: i.itemId,
            matchedItemName: i.item.name,
            quantity: i.quantity,
            unit: i.item.unit,
            unitPrice: i.unitPrice,
            lineTotal: i.lineTotal,
            confidence: 1.0,
          }))}
          priceAlerts={[]}
          supplierName={repeatLast.data.supplier.name}
          supplierMatchedId={repeatLast.data.supplierId}
          grandTotal={repeatLast.data.totalAmount}
          isDuplicate={false}
          inventoryItems={
            items.data?.map((i: any) => ({ id: i.id, name: i.name, unit: i.unit })) || []
          }
          suppliers={
            suppliers.data?.map((s: any) => ({ id: s.id, name: s.name })) || []
          }
          onSave={handleReviewSave}
          onCancel={() => {
            setEntryMode(null);
            setRepeatSupplierId("");
          }}
          saving={saveSmart.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Stock & Waste Operations</h1>
          <p className="text-xs text-muted-foreground">
            {profile.data?.assignedKiosk?.name || "Kiosk Stock Counter"}
          </p>
        </div>
      </div>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Hidden file input for waste photo */}
      <input
        ref={wasteFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleWastePhotoCapture}
      />

      {/* Operational Fast Actions Toolbar */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs h-10 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 flex flex-col items-center justify-center p-1"
          onClick={() => setShowAuto86(!showAuto86)}
        >
          <span className="flex items-center gap-1 font-bold">
            <Zap className="h-3.5 w-3.5 text-amber-600" /> Auto-86
          </span>
          <span className="text-[10px] text-amber-700">
            {items86edCount > 0 ? `${items86edCount} Out of Stock` : "All in Stock"}
          </span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-10 border-red-300 bg-red-50 text-red-900 hover:bg-red-100 flex flex-col items-center justify-center p-1"
          onClick={() => setShowWasteDialog(true)}
        >
          <span className="flex items-center gap-1 font-bold">
            <Trash2 className="h-3.5 w-3.5 text-red-600" /> Log Waste
          </span>
          <span className="text-[10px] text-red-700">Photo Verified</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-10 border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100 flex flex-col items-center justify-center p-1"
          onClick={() => setShowTransferDialog(true)}
        >
          <span className="flex items-center gap-1 font-bold">
            <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" /> Transfer
          </span>
          <span className="text-[10px] text-blue-700">Kiosk to Kiosk</span>
        </Button>
      </div>

      {/* Auto-86 Collapsible Panel */}
      {showAuto86 && (
        <Card className="border-amber-300 bg-amber-50/60 shadow-sm">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-amber-950">
              <Zap className="h-4 w-4 text-amber-600" />
              Instant Auto-86 (Depleted Item Toggles)
            </CardTitle>
            <CardDescription className="text-xs text-amber-800">
              Toggling an item instantly disables it on Counter POS and customer Self-Order QR.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-1 pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {kioskMenu.data?.items?.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                    item.is86ed
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-slate-900">{item.name}</span>
                    <span className="text-[11px] text-muted-foreground">{formatRupee(item.sellPrice)}</span>
                  </div>

                  <Button
                    size="sm"
                    variant={item.is86ed ? "destructive" : "outline"}
                    className="h-7 text-xs px-2.5 font-bold"
                    onClick={() => {
                      if (!kioskId) return;
                      toggle86Mutation.mutate({
                        kioskId,
                        itemId: item.id,
                        isAvailable: item.is86ed, // Toggle opposite
                      });
                    }}
                  >
                    {item.is86ed ? "86'D (OUT)" : "IN STOCK"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanning / Listening overlay */}
      {(scanning || listening) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="font-medium text-blue-800">
              {scanning ? "Reading bill photo..." : "Listening..."}
            </p>
            {listening && transcript && (
              <p className="text-sm text-blue-700 bg-white/50 rounded p-2 w-full">
                {transcript}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Entry Method Selector */}
      {!entryMode && !scanning && !listening && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Camera className="h-7 w-7 text-blue-600" />
            <span className="font-semibold text-xs text-blue-800">
              Scan Bill Photo
            </span>
          </button>

          <button
            onClick={() => setEntryMode("repeat")}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-green-300 bg-green-50 hover:bg-green-100 transition-colors"
          >
            <RefreshCw className="h-7 w-7 text-green-600" />
            <span className="font-semibold text-xs text-green-800">
              Repeat Last Delivery
            </span>
          </button>

          <button
            onClick={startVoice}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <Mic className="h-7 w-7 text-purple-600" />
            <span className="font-semibold text-xs text-purple-800">
              Voice Order
            </span>
          </button>

          <button
            onClick={() => setEntryMode("manual")}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <PenLine className="h-7 w-7 text-gray-600" />
            <span className="font-semibold text-xs text-gray-800">
              Manual Item Entry
            </span>
          </button>
        </div>
      )}

      {/* Repeat Last — Supplier Selector */}
      {entryMode === "repeat" && !repeatSupplierId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Supplier to Repeat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suppliers.data?.map((s: any) => (
              <button
                key={s.id}
                onClick={() => handleRepeatSelect(s.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {s._count?.purchases || 0} purchases
                </span>
              </button>
            ))}
            <Button
              variant="outline"
              className="w-full text-xs"
              onClick={() => setEntryMode(null)}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Manual Entry Form */}
      {entryMode === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manual Purchase Entry</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Supplier</Label>
              <Select value={manualSupplierId} onValueChange={setManualSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.data?.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setManualItems([
                      ...manualItems,
                      { itemId: "", quantity: 1, unitPrice: 0 },
                    ])
                  }
                >
                  + Add Item
                </Button>
              </div>
              {manualItems.map((mi, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select
                      value={mi.itemId}
                      onValueChange={(v) => {
                        const updated = [...manualItems];
                        updated[idx].itemId = v;
                        setManualItems(updated);
                      }}
                    >
                      <SelectTrigger className="text-xs h-8">
                        <SelectValue placeholder="Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.data?.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Qty"
                      className="h-8 text-sm"
                      value={mi.quantity || ""}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[idx].quantity = parseFloat(e.target.value) || 0;
                        setManualItems(updated);
                      }}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Price"
                      className="h-8 text-sm"
                      value={mi.unitPrice || ""}
                      onChange={(e) => {
                        const updated = [...manualItems];
                        updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                        setManualItems(updated);
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <button
                      onClick={() =>
                        setManualItems(manualItems.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {manualItems.length > 0 && (
                <p className="text-right text-sm font-medium">
                  Total:{" "}
                  {formatRupee(
                    manualItems.reduce(
                      (s, i) => s + i.quantity * i.unitPrice,
                      0
                    )
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => {
                  setEntryMode(null);
                  setManualItems([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 text-xs"
                onClick={handleManualSave}
                disabled={saveSmart.isPending}
              >
                {saveSmart.isPending ? "Saving..." : "Save Purchase"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Deliveries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Today&apos;s Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayPurchases.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : todayPurchases.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No deliveries recorded today
            </p>
          ) : (
            <div className="space-y-2">
              {todayPurchases.data?.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-xs"
                >
                  <div>
                    <p className="font-semibold">{p.supplier.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.items.length} items | {p.entryMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">
                      {formatRupee(p.totalAmount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(p.createdAt).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alerts */}
      {lowStock.data && lowStock.data.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Low Stock ({lowStock.data.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {lowStock.data.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm py-1"
                >
                  <span>{s.item.name}</span>
                  <Badge className="bg-amber-100 text-amber-700">
                    {s.currentQty} {s.item.unit} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Spoilage / Food Waste Dialog */}
      <Dialog open={showWasteDialog} onOpenChange={setShowWasteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Photo-Verified Spoilage & Waste Log
            </DialogTitle>
            <DialogDescription className="text-xs">
              Take a photo of damaged/curdled food items to log audited shrinkage.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div>
              <Label>Wasted Item</Label>
              <select
                className="w-full border rounded-md p-2 mt-1 text-sm bg-white"
                value={wasteItemId}
                onChange={(e) => setWasteItemId(e.target.value)}
              >
                <option value="">Select Item / Raw Material</option>
                {items.data?.map((it: any) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({formatRupee(it.costPrice)}/{it.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  placeholder="e.g. 5"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Reason</Label>
                <select
                  className="w-full border rounded-md p-2 mt-1 text-sm bg-white"
                  value={wasteReason}
                  onChange={(e: any) => setWasteReason(e.target.value)}
                >
                  <option value="CURDLED_MILK">Curdled Milk / Spoiled</option>
                  <option value="BURNT_PREP">Burnt in Kitchen</option>
                  <option value="DROPPED_DAMAGED">Dropped / Spilled</option>
                  <option value="EXPIRED_SHELF_LIFE">Expired Shelf Life</option>
                  <option value="PEST_DAMAGE">Pest / Weather Damage</option>
                </select>
              </div>
            </div>

            {/* Photo Capture Section */}
            <div>
              <Label>Audit Photo Proof (Mandatory for validation)</Label>
              <div className="mt-1">
                {wastePhotoUrl ? (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={wastePhotoUrl}
                      alt="Waste proof"
                      className="w-full h-36 object-cover"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 text-xs h-7"
                      onClick={() => setWastePhotoUrl("")}
                    >
                      Retake
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-16 border-dashed border-2 flex items-center justify-center gap-2"
                    onClick={() => wasteFileRef.current?.click()}
                  >
                    <Camera className="h-5 w-5 text-red-500" />
                    <span>Snap Photo Proof</span>
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Input
                placeholder="e.g. Morning 10 AM packet curdled on boiling"
                value={wasteNotes}
                onChange={(e) => setWasteNotes(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWasteDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleLogWasteSubmit}
              disabled={logWasteMutation.isPending}
            >
              {logWasteMutation.isPending ? "Logging..." : "Submit Waste Audit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inter-Kiosk Emergency Stock Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              Emergency Stock Transfer
            </DialogTitle>
            <DialogDescription className="text-xs">
              Borrow emergency items from nearby kiosks with automated audit transfer codes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Generate Transfer Code Banner */}
            {activeTransferCode && (
              <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-xl p-4 text-center space-y-1">
                <span className="text-xs uppercase tracking-wider text-blue-600 font-bold block">
                  SHOW THIS TRANSFER CODE TO SENDER KIOSK
                </span>
                <span className="text-3xl font-black text-blue-950 font-mono block">
                  {activeTransferCode}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Sender operator can enter this code in their stock page to approve transfer.
                </p>
              </div>
            )}

            {/* Request Form */}
            <div className="space-y-2 border-b pb-4">
              <h4 className="font-bold text-xs uppercase text-slate-700">1. Request Items From Another Kiosk</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">From Nearby Kiosk</Label>
                  <select
                    className="w-full border rounded-md p-1.5 mt-1 text-xs bg-white"
                    value={transferTargetKioskId}
                    onChange={(e) => setTransferTargetKioskId(e.target.value)}
                  >
                    <option value="">Select Kiosk</option>
                    {otherKiosks.data
                      ?.filter((k: any) => k.id !== kioskId)
                      .map((k: any) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs">Item Needed</Label>
                  <select
                    className="w-full border rounded-md p-1.5 mt-1 text-xs bg-white"
                    value={transferItemId}
                    onChange={(e) => setTransferItemId(e.target.value)}
                  >
                    <option value="">Select Item</option>
                    {items.data?.map((it: any) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  placeholder="Quantity (e.g. 50 cups / 5L)"
                  value={transferQty}
                  onChange={(e) => setTransferQty(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 shrink-0"
                  onClick={handleRequestTransferSubmit}
                  disabled={requestTransferMutation.isPending}
                >
                  Generate Code
                </Button>
              </div>
            </div>

            {/* Approve Incoming Transfer Form */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-700">2. Approve Incoming Transfer (Handoff)</h4>
              <p className="text-[11px] text-muted-foreground">
                Enter code provided by the borrowing kiosk operator to confirm you gave them items.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. TRF-8392"
                  value={acceptCode}
                  onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
                  className="h-8 text-xs font-mono font-bold uppercase"
                />
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 shrink-0"
                  onClick={() => {
                    if (!acceptCode) return;
                    acceptTransferMutation.mutate({ transferCode: acceptCode });
                  }}
                  disabled={acceptTransferMutation.isPending || !acceptCode}
                >
                  Approve Handoff
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
