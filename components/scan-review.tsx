"use client";

import { useState } from "react";
import { formatRupee } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Check, AlertTriangle, X, Trash2 } from "lucide-react";

export interface ReviewItem {
  rawText: string;
  matchedItemId: string | null;
  matchedItemName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  confidence: number;
}

export interface PriceAlert {
  itemId: string;
  itemName: string;
  lastPrice: number;
  newPrice: number;
  percentChange: number;
  message: string;
}

interface ScanReviewProps {
  items: ReviewItem[];
  priceAlerts: PriceAlert[];
  supplierName: string | null;
  supplierMatchedId: string | null;
  grandTotal: number;
  isDuplicate: boolean;
  inventoryItems: { id: string; name: string; unit: string }[];
  suppliers: { id: string; name: string }[];
  onSave: (data: {
    supplierId: string;
    items: { itemId: string; quantity: number; unitPrice: number }[];
  }) => void;
  onCancel: () => void;
  saving: boolean;
}

export function ScanReview({
  items: initialItems,
  priceAlerts,
  supplierName,
  supplierMatchedId,
  grandTotal,
  isDuplicate,
  inventoryItems,
  suppliers,
  onSave,
  onCancel,
  saving,
}: ScanReviewProps) {
  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    supplierMatchedId || ""
  );

  const updateItem = (idx: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      (updated[idx] as any)[field] = value;
      if (field === "quantity" || field === "unitPrice") {
        updated[idx].lineTotal = updated[idx].quantity * updated[idx].unitPrice;
      }
      return updated;
    });
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const matchItem = (idx: number, itemId: string) => {
    const inv = inventoryItems.find((i) => i.id === itemId);
    if (inv) {
      setItems((prev) => {
        const updated = [...prev];
        updated[idx].matchedItemId = inv.id;
        updated[idx].matchedItemName = inv.name;
        updated[idx].confidence = 1.0;
        return updated;
      });
    }
  };

  const total = items.reduce((s, i) => s + i.lineTotal, 0);
  const matchedCount = items.filter((i) => i.matchedItemId).length;
  const unmatchedCount = items.length - matchedCount;

  const canSave =
    selectedSupplierId &&
    items.length > 0 &&
    items.every((i) => i.matchedItemId && i.quantity > 0 && i.unitPrice > 0);

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      supplierId: selectedSupplierId,
      items: items.map((i) => ({
        itemId: i.matchedItemId!,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    });
  };

  return (
    <div className="space-y-4">
      {/* Duplicate Warning */}
      {isDuplicate && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-3 flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              Possible duplicate — a similar purchase from this supplier was
              already recorded today.
            </span>
          </CardContent>
        </Card>
      )}

      {/* Price Alerts */}
      {priceAlerts.length > 0 && (
        <div className="space-y-1">
          {priceAlerts.map((alert, i) => (
            <div
              key={i}
              className="bg-orange-50 border border-orange-200 rounded px-3 py-1.5 text-sm text-orange-800 flex items-center gap-2"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Supplier Selector */}
      <div>
        <label className="text-sm font-medium mb-1 block">Supplier</label>
        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
          <SelectTrigger>
            <SelectValue
              placeholder={supplierName || "Select supplier..."}
            />
          </SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Match Summary */}
      <div className="flex gap-3 text-sm">
        <Badge className="bg-green-100 text-green-700">
          <Check className="h-3 w-3 mr-1" /> {matchedCount} matched
        </Badge>
        {unmatchedCount > 0 && (
          <Badge className="bg-red-100 text-red-700">
            <X className="h-3 w-3 mr-1" /> {unmatchedCount} unmatched
          </Badge>
        )}
        <span className="ml-auto font-medium">{items.length} items</span>
      </div>

      {/* Items Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="w-20">Qty</TableHead>
              <TableHead className="w-16">Unit</TableHead>
              <TableHead className="w-24">Price</TableHead>
              <TableHead className="w-24 text-right">Total</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow
                key={idx}
                className={
                  !item.matchedItemId
                    ? "bg-red-50"
                    : item.confidence < 0.8
                      ? "bg-amber-50"
                      : ""
                }
              >
                {/* Status icon */}
                <TableCell className="px-2">
                  {item.matchedItemId ? (
                    item.confidence >= 0.8 ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )
                  ) : (
                    <X className="h-4 w-4 text-red-500" />
                  )}
                </TableCell>

                {/* Item name / match selector */}
                <TableCell>
                  {item.matchedItemId ? (
                    <div>
                      <span className="font-medium text-sm">
                        {item.matchedItemName}
                      </span>
                      {item.rawText !== item.matchedItemName && (
                        <span className="block text-xs text-muted-foreground">
                          Bill: &quot;{item.rawText}&quot;
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <span className="text-xs text-red-600">
                        &quot;{item.rawText}&quot; — not matched
                      </span>
                      <Select
                        value=""
                        onValueChange={(v) => matchItem(idx, v)}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Select item..." />
                        </SelectTrigger>
                        <SelectContent>
                          {inventoryItems.map((inv) => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TableCell>

                {/* Quantity */}
                <TableCell>
                  <Input
                    type="number"
                    value={item.quantity || ""}
                    onChange={(e) =>
                      updateItem(idx, "quantity", parseFloat(e.target.value) || 0)
                    }
                    className="h-8 w-20 text-sm"
                  />
                </TableCell>

                {/* Unit */}
                <TableCell className="text-xs text-muted-foreground">
                  {item.unit}
                </TableCell>

                {/* Price */}
                <TableCell>
                  <Input
                    type="number"
                    value={item.unitPrice || ""}
                    onChange={(e) =>
                      updateItem(
                        idx,
                        "unitPrice",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="h-8 w-24 text-sm"
                  />
                </TableCell>

                {/* Total */}
                <TableCell className="text-right text-sm font-medium">
                  {formatRupee(item.lineTotal)}
                </TableCell>

                {/* Remove */}
                <TableCell className="px-2">
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Grand Total */}
      <div className="flex items-center justify-between px-2">
        <span className="text-muted-foreground text-sm">
          {grandTotal !== total && (
            <span>Bill total: {formatRupee(grandTotal)} | </span>
          )}
          Calculated:
        </span>
        <span className="text-xl font-bold">{formatRupee(total)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!canSave || saving}
          className="flex-1"
        >
          {saving ? "Saving..." : "Save & Update Stock"}
        </Button>
      </div>
    </div>
  );
}
