"use client";

import { trpc } from "@/lib/trpc-client";
import { formatDate, formatRupee } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, AlertTriangle, Ban } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ReconcilePage() {
  const [viewId, setViewId] = useState<string | null>(null);
  const [confirmVoidId, setConfirmVoidId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const recons = trpc.reconciliation.list.useQuery();
  const detail = trpc.reconciliation.getById.useQuery(
    { id: viewId! },
    { enabled: !!viewId }
  );

  const voidRecon = trpc.reconciliation.void.useMutation({
    onSuccess: () => {
      utils.reconciliation.list.invalidate();
      setConfirmVoidId(null);
      setViewId(null);
      toast.success("Reconciliation voided successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleVoid = () => {
    if (confirmVoidId) {
      voidRecon.mutate({ id: confirmVoidId });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reconciliation</h1>
        <p className="text-muted-foreground">View all reconciliation records and losses</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {recons.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Loss</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recons.data?.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell className="font-medium">{r.kiosk.name}</TableCell>
                    <TableCell>{r.operator.name}</TableCell>
                    <TableCell>{r.items.length} items</TableCell>
                    <TableCell className="text-right">
                      {r.totalLoss > 0 ? (
                        <span className="text-red-600 font-medium">{formatRupee(r.totalLoss)}</span>
                      ) : (
                        <span className="text-green-600">No loss</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewId(r.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {recons.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No reconciliations yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewId} onOpenChange={(v) => !v && setViewId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reconciliation Details</DialogTitle>
          </DialogHeader>
          {detail.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Kiosk</p>
                  <p className="font-medium">{detail.data.kiosk.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(detail.data.date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Loss</p>
                  <p className={`font-medium ${detail.data.totalLoss > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatRupee(detail.data.totalLoss)}
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Dispatched</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Returned</TableHead>
                    <TableHead className="text-right">Wasted</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    <TableHead className="text-right">Loss Qty</TableHead>
                    <TableHead className="text-right">Loss Amt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.data.items.map((item) => (
                    <TableRow key={item.id} className={item.chargeableLoss > 0 ? "bg-red-50" : ""}>
                      <TableCell className="font-medium">{item.item.name}</TableCell>
                      <TableCell className="text-right">{item.dispatched}</TableCell>
                      <TableCell className="text-right">{item.sold}</TableCell>
                      <TableCell className="text-right">{item.returned}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.wasted > item.allowedMargin ? "text-red-600 font-medium" : ""}>
                          {item.wasted}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs">
                          {item.allowedMargin}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.chargeableLoss > 0 ? (
                          <span className="text-red-600">{item.chargeableLoss}</span>
                        ) : (
                          "0"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.lossAmount > 0 ? (
                          <span className="text-red-600 font-medium">{formatRupee(item.lossAmount)}</span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Void Button */}
              {detail.data.status !== "VOIDED" && (
                <div className="pt-4 border-t">
                  {confirmVoidId === detail.data.id ? (
                    <div className="flex items-center gap-3">
                      <p className="text-sm text-red-600 flex-1">
                        <AlertTriangle className="h-4 w-4 inline mr-1" />
                        Are you sure you want to void this reconciliation? This cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleVoid}
                        disabled={voidRecon.isPending}
                      >
                        {voidRecon.isPending ? "Voiding..." : "Confirm Void"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmVoidId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setConfirmVoidId(detail.data!.id)}
                    >
                      <Ban className="h-4 w-4 mr-1" /> Void Reconciliation
                    </Button>
                  )}
                </div>
              )}

              {detail.data.status === "VOIDED" && (
                <div className="pt-4 border-t">
                  <Badge className="bg-red-100 text-red-700">VOIDED</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
