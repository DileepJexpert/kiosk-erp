"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanReview } from "@/components/scan-review";
import {
  Camera,
  RefreshCw,
  Mic,
  FileText,
  ShieldCheck,
  ShieldX,
  Loader2,
  Package,
} from "lucide-react";
import { toast } from "sonner";

export default function PurchasesPage() {
  const [scanMode, setScanMode] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [textInput, setTextInput] = useState("");
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectId, setRejectId] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const purchases = trpc.supplier.listPurchases.useQuery();
  const suppliers = trpc.supplier.list.useQuery();
  const items = trpc.item.list.useQuery();
  const pending = trpc.purchaseSmart.pendingApprovals.useQuery();
  const templates = trpc.purchaseSmart.listTemplates.useQuery();

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

  const parseText = trpc.purchaseSmart.parseText.useMutation({
    onSuccess: (data) => {
      setTextDialogOpen(false);
      setReviewData(data);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveSmart = trpc.purchaseSmart.saveSmart.useMutation({
    onSuccess: () => {
      toast.success("Purchase saved!");
      setReviewData(null);
      setScanMode(false);
      purchases.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const approve = trpc.purchaseSmart.approve.useMutation({
    onSuccess: () => {
      toast.success("Purchase approved, stock updated");
      pending.refetch();
      purchases.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const reject = trpc.purchaseSmart.reject.useMutation({
    onSuccess: () => {
      toast.success("Purchase rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      pending.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setScanMode(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      scanBill.mutate({ imageBase64: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleTextParse = () => {
    if (!textInput.trim()) return;
    parseText.mutate({ text: textInput });
  };

  const handleReviewSave = (data: {
    supplierId: string;
    items: { itemId: string; quantity: number; unitPrice: number }[];
  }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    saveSmart.mutate({
      supplierId: data.supplierId,
      date: today,
      entryMethod: scanMode ? "PHOTO_SCAN" : "MANUAL",
      aiExtractedRaw: reviewData?.extracted,
      aiConfidence: reviewData?.extracted?.confidence,
      items: data.items,
    });
  };

  const entryMethodLabel = (m: string) => {
    const map: Record<string, string> = {
      MANUAL: "Manual",
      PHOTO_SCAN: "Scan",
      VOICE: "Voice",
      REPEAT: "Repeat",
      BATCH_SCAN: "Batch",
      WHATSAPP_TEXT: "WhatsApp",
    };
    return map[m] || m;
  };

  // ── Review mode ──
  if (reviewData?.extracted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Review Extracted Items</h1>
          <p className="text-muted-foreground">
            Verify and correct the AI-extracted purchase data
          </p>
        </div>
        <ScanReview
          items={reviewData.extracted.items || []}
          priceAlerts={reviewData.priceAlerts || []}
          supplierName={reviewData.extracted.supplier?.name}
          supplierMatchedId={reviewData.extracted.supplier?.matchedId}
          grandTotal={reviewData.extracted.grandTotal || 0}
          isDuplicate={reviewData.isDuplicate || false}
          inventoryItems={
            items.data?.map((i) => ({ id: i.id, name: i.name, unit: i.unit })) ||
            []
          }
          suppliers={
            suppliers.data?.map((s) => ({ id: s.id, name: s.name })) || []
          }
          onSave={handleReviewSave}
          onCancel={() => {
            setReviewData(null);
            setScanMode(false);
          }}
          saving={saveSmart.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Purchases</h1>
          <p className="text-muted-foreground">
            Smart purchase entry — scan, paste, or type
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          <Button onClick={() => fileInputRef.current?.click()}>
            <Camera className="h-4 w-4 mr-1" />
            {scanning ? "Scanning..." : "Scan Bill"}
          </Button>
          <Button variant="outline" onClick={() => setTextDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-1" /> Paste Text
          </Button>
        </div>
      </div>

      {/* Scanning loader */}
      {scanning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-6 flex items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <span className="font-medium text-blue-800">
              AI is reading your bill...
            </span>
          </CardContent>
        </Card>
      )}

      {/* Text Parse Dialog */}
      <Dialog open={textDialogOpen} onOpenChange={setTextDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste Bill Text</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Paste WhatsApp message or type bill content. Hindi or English.
          </p>
          <Textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="e.g. 20 kg pyaaz 40 rs/kg, 10 kg gobhi 30 rs/kg..."
            rows={5}
          />
          <Button
            onClick={handleTextParse}
            disabled={parseText.isPending || !textInput.trim()}
          >
            {parseText.isPending ? "Parsing..." : "Extract Items"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            rows={3}
          />
          <Button
            variant="destructive"
            onClick={() =>
              reject.mutate({ purchaseId: rejectId, reason: rejectReason })
            }
            disabled={reject.isPending || !rejectReason.trim()}
          >
            {reject.isPending ? "Rejecting..." : "Reject"}
          </Button>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Purchases</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Approval
            {pending.data && pending.data.length > 0 && (
              <Badge className="ml-1 bg-amber-100 text-amber-700 text-xs px-1.5">
                {pending.data.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* All Purchases */}
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {purchases.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.data?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{formatDate(p.date)}</TableCell>
                        <TableCell className="font-medium">
                          {p.supplier.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entryMethodLabel(p.entryMethod)}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.items.length} items</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatRupee(p.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              p.approvalStatus === "APPROVED" ||
                              p.approvalStatus === "AUTO_APPROVED"
                                ? "bg-green-100 text-green-700"
                                : p.approvalStatus === "REJECTED"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }
                          >
                            {p.approvalStatus === "AUTO_APPROVED"
                              ? "Approved"
                              : p.approvalStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {purchases.data?.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No purchases yet. Scan a bill to get started!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Approvals */}
        <TabsContent value="pending" className="mt-4">
          {pending.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : pending.data?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No purchases pending approval
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.data?.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{p.supplier.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.items.length} items | {formatDate(p.date)} |{" "}
                          {entryMethodLabel(p.entryMethod)}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {p.items.slice(0, 4).map((item) => (
                            <Badge
                              key={item.id}
                              variant="outline"
                              className="text-xs"
                            >
                              {item.item.name} x{item.quantity}
                            </Badge>
                          ))}
                          {p.items.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{p.items.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {formatRupee(p.totalAmount)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              approve.mutate({ purchaseId: p.id })
                            }
                            disabled={approve.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setRejectId(p.id);
                              setRejectDialogOpen(true);
                            }}
                          >
                            <ShieldX className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="mt-4">
          {templates.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : templates.data?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No templates yet.</p>
                <p className="text-xs mt-1">
                  Templates are auto-suggested after 3+ purchases from the same
                  supplier.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {templates.data?.map((t) => (
                <Card key={t.id}>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.supplier.name} | Used {t.usageCount} times
                        {t.lastUsedAt &&
                          ` | Last: ${formatDate(t.lastUsedAt)}`}
                      </p>
                    </div>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Use
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
