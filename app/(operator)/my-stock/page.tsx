"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScanReview, ReviewItem } from "@/components/scan-review";
import {
  Camera,
  Mic,
  RefreshCw,
  Package,
  AlertTriangle,
  Loader2,
  PenLine,
  X,
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayPurchases = trpc.purchaseSmart.todayPurchases.useQuery();
  const lowStock = trpc.purchaseSmart.lowStockItems.useQuery();
  const suppliers = trpc.supplier.list.useQuery();
  const items = trpc.item.list.useQuery();

  const scanBill = trpc.purchaseSmart.scanBill.useMutation({
    onSuccess: (data) => {
      setScanning(false);
      setReviewData(data);
    },
    onError: (err) => {
      setScanning(false);
      toast.error(err.message);
    },
  });

  const parseVoice = trpc.purchaseSmart.parseVoice.useMutation({
    onSuccess: (data) => {
      setListening(false);
      setReviewData(data);
    },
    onError: (err) => {
      setListening(false);
      toast.error(err.message);
    },
  });

  const repeatLast = trpc.purchaseSmart.repeatLast.useQuery(
    { supplierId: repeatSupplierId },
    { enabled: !!repeatSupplierId }
  );

  const saveSmart = trpc.purchaseSmart.saveSmart.useMutation({
    onSuccess: (data) => {
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
    onError: (err) => toast.error(err.message),
  });

  // ── Photo capture ──
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

  // ── Voice entry ──
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

    let finalTranscript = "";
    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + " ";
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        parseVoice.mutate({ transcript: finalTranscript.trim() });
      } else {
        setListening(false);
        toast.error("No speech detected. Try again.");
      }
    };

    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice recognition error. Try again.");
    };

    recognition.start();

    // Auto-stop after 30 seconds
    setTimeout(() => {
      try {
        recognition.stop();
      } catch {}
    }, 30000);
  };

  // ── Repeat last ──
  const handleRepeatSelect = (supplierId: string) => {
    setRepeatSupplierId(supplierId);
    setEntryMode("repeat");
  };

  // ── Manual entry ──
  const handleManualSave = () => {
    if (!manualSupplierId || manualItems.length === 0) return;
    const validItems = manualItems.filter(
      (i) => i.itemId && i.quantity > 0 && i.unitPrice > 0
    );
    if (validItems.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    saveSmart.mutate({
      supplierId: manualSupplierId,
      date: today,
      entryMethod: "MANUAL",
      items: validItems,
    });
  };

  // ── Save from review ──
  const handleReviewSave = (data: {
    supplierId: string;
    items: { itemId: string; quantity: number; unitPrice: number }[];
  }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    saveSmart.mutate({
      supplierId: data.supplierId,
      date: today,
      entryMethod:
        entryMode === "scan"
          ? "PHOTO_SCAN"
          : entryMode === "voice"
            ? "VOICE"
            : "REPEAT",
      aiExtractedRaw: reviewData?.extracted,
      aiConfidence: reviewData?.extracted?.confidence,
      voiceTranscript:
        entryMode === "voice" ? reviewData?.voiceTranscript : undefined,
      items: data.items,
    });
  };

  // ── Review mode ──
  if (reviewData?.extracted) {
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
            items.data?.map((i) => ({ id: i.id, name: i.name, unit: i.unit })) || []
          }
          suppliers={
            suppliers.data?.map((s) => ({ id: s.id, name: s.name })) || []
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

  // ── Repeat last mode ──
  if (entryMode === "repeat" && repeatLast.data) {
    return (
      <div className="space-y-4 pb-4">
        <h1 className="text-xl font-bold">Repeat Purchase</h1>
        <p className="text-sm text-muted-foreground">
          From: {repeatLast.data.supplier.name} — Last order{" "}
          {new Date(repeatLast.data.date).toLocaleDateString("en-IN")}
        </p>
        <ScanReview
          items={repeatLast.data.items.map((i) => ({
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
            items.data?.map((i) => ({ id: i.id, name: i.name, unit: i.unit })) || []
          }
          suppliers={
            suppliers.data?.map((s) => ({ id: s.id, name: s.name })) || []
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
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">Stock Received</h1>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoCapture}
      />

      {/* Scanning / Listening overlay */}
      {(scanning || listening) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="font-medium text-blue-800">
              {scanning ? "Reading bill..." : "Listening..."}
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
            className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <Camera className="h-8 w-8 text-blue-600" />
            <span className="font-semibold text-sm text-blue-800">
              Scan Bill
            </span>
          </button>

          <Dialog>
            <button
              onClick={() => setEntryMode("repeat")}
              className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-green-300 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <RefreshCw className="h-8 w-8 text-green-600" />
              <span className="font-semibold text-sm text-green-800">
                Repeat Last
              </span>
            </button>
          </Dialog>

          <button
            onClick={startVoice}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <Mic className="h-8 w-8 text-purple-600" />
            <span className="font-semibold text-sm text-purple-800">
              Voice Entry
            </span>
          </button>

          <button
            onClick={() => setEntryMode("manual")}
            className="flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <PenLine className="h-8 w-8 text-gray-600" />
            <span className="font-semibold text-sm text-gray-800">
              Manual Entry
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
            {suppliers.data?.map((s) => (
              <button
                key={s.id}
                onClick={() => handleRepeatSelect(s.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {s._count.purchases} purchases
                </span>
              </button>
            ))}
            <Button
              variant="outline"
              className="w-full"
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
                  {suppliers.data?.map((s) => (
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
                        {items.data?.map((item) => (
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
                className="flex-1"
                onClick={() => {
                  setEntryMode(null);
                  setManualItems([]);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
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
              {todayPurchases.data?.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{p.supplier.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.items.length} items |{" "}
                      <Badge variant="outline" className="text-xs px-1">
                        {p.entryMethod}
                      </Badge>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">
                      {formatRupee(p.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
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
              {lowStock.data.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm"
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
    </div>
  );
}
