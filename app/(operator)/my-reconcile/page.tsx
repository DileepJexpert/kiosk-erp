"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardCheck, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ReconEntry {
  itemId: string;
  itemName: string;
  dispatched: number;
  sold: number;
  returned: number;
  wasted: number;
  margin: number;
  costPrice: number;
  chargeableLoss: number;
  lossAmount: number;
}

export default function OperatorReconcilePage() {
  const [selectedDispatch, setSelectedDispatch] = useState<string | null>(null);
  const [entries, setEntries] = useState<ReconEntry[]>([]);
  const [reconNotes, setReconNotes] = useState("");
  const utils = trpc.useUtils();

  const dispatches = trpc.dispatch.getUnreconciled.useQuery();

  const dispatchDetail = trpc.dispatch.getById.useQuery(
    { id: selectedDispatch! },
    { enabled: !!selectedDispatch }
  );

  const submitRecon = trpc.reconciliation.create.useMutation({
    onSuccess: (data) => {
      utils.dispatch.getUnreconciled.invalidate();
      setSelectedDispatch(null);
      setEntries([]);
      setReconNotes("");

      if (data.warnings.length > 0) {
        toast.warning(
          `Reconciliation saved with warnings: ${data.warnings
            .map((w) => `${w.itemName}: billed ${w.billedQty} vs reported ${w.reconSold}`)
            .join("; ")}`
        );
      } else {
        toast.success("Reconciliation submitted successfully!");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // When dispatch detail loads, initialize entries
  useEffect(() => {
    if (dispatchDetail.data) {
      setEntries(
        dispatchDetail.data.items.map((di) => ({
          itemId: di.itemId,
          itemName: di.item.name,
          dispatched: di.quantity,
          sold: 0,
          returned: 0,
          wasted: di.quantity,
          margin: di.item.dailyMargin,
          costPrice: di.item.costPrice,
          chargeableLoss: Math.max(0, di.quantity - di.item.dailyMargin),
          lossAmount: Math.max(0, di.quantity - di.item.dailyMargin) * di.item.costPrice,
        }))
      );
    }
  }, [dispatchDetail.data]);

  const updateEntry = (index: number, field: "sold" | "returned", value: number) => {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        const updated = { ...entry, [field]: value };
        const wasted = updated.dispatched - updated.sold - updated.returned;
        const chargeableLoss = Math.max(0, wasted - updated.margin);
        return {
          ...updated,
          wasted,
          chargeableLoss,
          lossAmount: chargeableLoss * updated.costPrice,
        };
      })
    );
  };

  const totalLoss = entries.reduce((sum, e) => sum + e.lossAmount, 0);
  const hasErrors = entries.some((e) => e.wasted < 0);

  const handleSubmit = () => {
    if (!selectedDispatch || hasErrors) return;
    submitRecon.mutate({
      dispatchId: selectedDispatch,
      items: entries.map((e) => ({
        itemId: e.itemId,
        dispatched: e.dispatched,
        sold: e.sold,
        returned: e.returned,
      })),
      ...(reconNotes.trim() && { notes: reconNotes.trim() }),
    });
  };

  if (!selectedDispatch) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">Reconcile</h1>
        <p className="text-sm text-muted-foreground">Select a dispatch to reconcile</p>

        {dispatches.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : dispatches.data?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm text-muted-foreground">No dispatches pending reconciliation</p>
            </CardContent>
          </Card>
        ) : (
          dispatches.data?.filter((d) => d.status === "CONFIRMED").map((dispatch) => (
            <Card
              key={dispatch.id}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => setSelectedDispatch(dispatch.id)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{dispatch.kiosk.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(dispatch.date)} · {dispatch.items.length} items
                    </p>
                  </div>
                  <ClipboardCheck className="h-5 w-5 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Reconcile</h1>
        <Button variant="ghost" size="sm" onClick={() => { setSelectedDispatch(null); setEntries([]); }}>
          Back
        </Button>
      </div>

      {dispatchDetail.isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          {entries.map((entry, idx) => (
            <Card key={entry.itemId} className={entry.wasted < 0 ? "border-red-300 bg-red-50" : entry.chargeableLoss > 0 ? "border-amber-200 bg-amber-50" : ""}>
              <CardContent className="py-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{entry.itemName}</p>
                    <p className="text-sm text-muted-foreground">
                      Dispatched: <strong>{entry.dispatched}</strong> · Margin: <span className="text-amber-600 font-medium">{entry.margin}</span>
                    </p>
                  </div>
                  {entry.chargeableLoss > 0 && (
                    <Badge className="bg-red-100 text-red-700">
                      Loss: {formatRupee(entry.lossAmount)}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Sold</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-12 text-lg text-center"
                      value={entry.sold || ""}
                      onChange={(e) => updateEntry(idx, "sold", parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-medium">Returned</label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      className="h-12 text-lg text-center"
                      value={entry.returned || ""}
                      onChange={(e) => updateEntry(idx, "returned", parseInt(e.target.value) || 0)}
                      min={0}
                    />
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Wasted: <strong className={entry.wasted < 0 ? "text-red-600" : entry.wasted > entry.margin ? "text-red-600" : "text-green-600"}>{entry.wasted}</strong></span>
                  <span>Chargeable: <strong>{entry.chargeableLoss}</strong></span>
                </div>

                {entry.wasted < 0 && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Sold + Returned exceeds dispatched
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Notes */}
          <Card>
            <CardContent className="py-4 space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                name="notes"
                placeholder="Optional notes for this reconciliation"
                value={reconNotes}
                onChange={(e) => setReconNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {/* Total and Submit */}
          <Card className="border-2 border-orange-200 sticky bottom-20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Total Loss</span>
                <span className={`text-xl font-bold ${totalLoss > 0 ? "text-red-600" : "text-green-600"}`}>
                  {totalLoss > 0 ? formatRupee(totalLoss) : "No loss"}
                </span>
              </div>
              <Button
                className="w-full h-14 text-lg"
                onClick={handleSubmit}
                disabled={submitRecon.isPending || hasErrors}
              >
                {submitRecon.isPending ? "Submitting..." : "Submit Reconciliation"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
