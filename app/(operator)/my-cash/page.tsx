"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, getToday } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Banknote,
  CheckCircle,
  ShieldCheck,
  Calculator,
  Printer,
  FileSpreadsheet,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { printThermalRaw, generateZReportPrintText } from "@/lib/printer-thermal";

export default function MyCashPage() {
  const [c500, setC500] = useState("");
  const [c200, setC200] = useState("");
  const [c100, setC100] = useState("");
  const [c50, setC50] = useState("");
  const [c20, setC20] = useState("");
  const [c10, setC10] = useState("");
  const [coins, setCoins] = useState("");
  const [shortageReason, setShortageReason] = useState("");
  const [showZReportDialog, setShowZReportDialog] = useState(false);

  const today = getToday();
  const profile = trpc.user.getProfile.useQuery();
  const kioskId = profile.data?.assignedKiosk?.id;

  const todayCollection = trpc.cashCollection.getByDate.useQuery(
    { kioskId: kioskId!, date: today },
    { enabled: !!kioskId }
  );

  const zReportQuery = trpc.billing.getZReport.useQuery(
    { kioskId: kioskId!, date: today },
    { enabled: !!kioskId && showZReportDialog }
  );

  const blindDropMutation = trpc.cashCollection.recordBlindDrop.useMutation({
    onSuccess: (data: any) => {
      toast.success(data.message || "Blind cash drop recorded!");
      todayCollection.refetch();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalCalculatedCash =
    (parseInt(c500) || 0) * 500 +
    (parseInt(c200) || 0) * 200 +
    (parseInt(c100) || 0) * 100 +
    (parseInt(c50) || 0) * 50 +
    (parseInt(c20) || 0) * 20 +
    (parseInt(c10) || 0) * 10 +
    (parseFloat(coins) || 0);

  const handleSubmitBlindDrop = () => {
    if (!kioskId) return;
    if (totalCalculatedCash <= 0 && !shortageReason) {
      toast.error("Please enter your counted currency denominations");
      return;
    }

    blindDropMutation.mutate({
      kioskId,
      date: today,
      denominations: {
        c500: parseInt(c500) || 0,
        c200: parseInt(c200) || 0,
        c100: parseInt(c100) || 0,
        c50: parseInt(c50) || 0,
        c20: parseInt(c20) || 0,
        c10: parseInt(c10) || 0,
        coins: parseFloat(coins) || 0,
      },
      shortageReason: shortageReason || undefined,
    });
  };

  const handlePrintZReport = () => {
    if (!zReportQuery.data) return;
    const rawSlip = generateZReportPrintText(zReportQuery.data);
    printThermalRaw(rawSlip, `Z-Report-${profile.data?.assignedKiosk?.name}`);
  };

  if (profile.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" />
            Blind Cash Drop & Shift Handover
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Anti-theft protocol: count drawer currency blindly. Discrepancy is audited directly by management.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-xs h-9 border-slate-300 gap-1.5 font-semibold"
          onClick={() => setShowZReportDialog(true)}
        >
          <Receipt className="h-4 w-4 text-orange-600" />
          Shift Z-Report
        </Button>
      </div>

      {/* Security Info Card */}
      <Card className="bg-slate-900 text-white border-slate-800">
        <CardContent className="py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold">Strict Blind Protocol Active</p>
              <p className="text-[11px] text-slate-400">
                System expected cash is concealed to eliminate skimming.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px]">
            {profile.data?.assignedKiosk?.name || "Counter Kiosk"}
          </Badge>
        </CardContent>
      </Card>

      {/* Already Submitted View */}
      {todayCollection.data ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="pt-5 pb-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-emerald-950 text-base">Blind Cash Drop Submitted</h3>
                  <p className="text-xs text-emerald-700">
                    Recorded on {new Date(todayCollection.data.createdAt).toLocaleTimeString("en-IN")}
                  </p>
                </div>
              </div>

              <Button
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5 h-8 font-semibold"
                onClick={() => setShowZReportDialog(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                Print Shift Slip
              </Button>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Physical Cash Dropped:</span>
                <span className="text-lg font-extrabold text-slate-900">
                  {formatRupee(todayCollection.data.actualCash)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t">
                <span>Audit Status:</span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                  Submitted to Owner EOD
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Blind Cash Drop Denominations Entry Form */
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4 text-orange-600" />
              Currency Denomination Counter
            </CardTitle>
            <CardDescription className="text-xs">
              Count each note in your cash box and enter the quantity.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* ₹500 */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <span className="font-bold text-slate-700 w-12 text-center">₹500 ×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={c500}
                  onChange={(e) => setC500(e.target.value)}
                  className="h-9 text-sm text-center font-bold"
                />
              </div>

              {/* ₹200 */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <span className="font-bold text-slate-700 w-12 text-center">₹200 ×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={c200}
                  onChange={(e) => setC200(e.target.value)}
                  className="h-9 text-sm text-center font-bold"
                />
              </div>

              {/* ₹100 */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <span className="font-bold text-slate-700 w-12 text-center">₹100 ×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={c100}
                  onChange={(e) => setC100(e.target.value)}
                  className="h-9 text-sm text-center font-bold"
                />
              </div>

              {/* ₹50 */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <span className="font-bold text-slate-700 w-12 text-center">₹50 ×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={c50}
                  onChange={(e) => setC50(e.target.value)}
                  className="h-9 text-sm text-center font-bold"
                />
              </div>

              {/* ₹20 */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <span className="font-bold text-slate-700 w-12 text-center">₹20 ×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={c20}
                  onChange={(e) => setC20(e.target.value)}
                  className="h-9 text-sm text-center font-bold"
                />
              </div>

              {/* ₹10 */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border">
                <span className="font-bold text-slate-700 w-12 text-center">₹10 ×</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={c10}
                  onChange={(e) => setC10(e.target.value)}
                  className="h-9 text-sm text-center font-bold"
                />
              </div>

              {/* Coins Total */}
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border col-span-2">
                <span className="font-bold text-slate-700 w-24">Coins Total:</span>
                <Input
                  type="number"
                  placeholder="₹ Total in coins"
                  value={coins}
                  onChange={(e) => setCoins(e.target.value)}
                  className="h-9 text-sm font-bold"
                />
              </div>
            </div>

            {/* Total Counted Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
              <div>
                <span className="text-xs text-emerald-800 font-semibold block">Total Cash Counted</span>
                <span className="text-[11px] text-muted-foreground">Will be sealed in handover envelope</span>
              </div>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {formatRupee(totalCalculatedCash)}
              </span>
            </div>

            {/* Optional Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Handover Notes / Cash Box Reference</Label>
              <Textarea
                placeholder="e.g. Sealed in envelope #4, ₹50 kept in drawer as float..."
                value={shortageReason}
                onChange={(e) => setShortageReason(e.target.value)}
                className="text-xs"
                rows={2}
              />
            </div>

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-sm font-bold"
              onClick={handleSubmitBlindDrop}
              disabled={blindDropMutation.isPending}
            >
              {blindDropMutation.isPending ? "Submitting Drop..." : `Submit Blind Drop (${formatRupee(totalCalculatedCash)})`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Shift Closing Z-Report Dialog */}
      <Dialog open={showZReportDialog} onOpenChange={setShowZReportDialog}>
        <DialogContent className="max-w-md p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-orange-600" />
              Daily Shift Closing (Z-Report)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official shift register settlement and financial audit summary.
            </DialogDescription>
          </DialogHeader>

          {zReportQuery.isLoading ? (
            <p className="text-xs text-muted-foreground text-center py-6">Generating shift financials...</p>
          ) : zReportQuery.data ? (
            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {/* Summary Header */}
              <div className="bg-slate-50 p-3 rounded-lg border space-y-1">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>{zReportQuery.data.kiosk.name}</span>
                  <span className="font-mono">{zReportQuery.data.reportNumber}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Cashier: {zReportQuery.data.kiosk.operatorName} • GSTIN: {zReportQuery.data.kiosk.gstin}
                </p>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Gross Sales</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {formatRupee(zReportQuery.data.financials.grossSales)}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border">
                  <span className="text-[11px] text-muted-foreground block">Net Revenue</span>
                  <span className="text-base font-bold text-emerald-600 font-mono">
                    {formatRupee(zReportQuery.data.financials.netRevenue)}
                  </span>
                </div>
              </div>

              {/* Payments Split */}
              <div className="border rounded-lg p-2.5 space-y-1">
                <span className="font-bold text-slate-700 block">Payment Methods</span>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Cash ({zReportQuery.data.payments.cash.count} bills):</span>
                  <span className="font-mono font-semibold">{formatRupee(zReportQuery.data.payments.cash.amount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>UPI QR ({zReportQuery.data.payments.upi.count} bills):</span>
                  <span className="font-mono font-semibold">{formatRupee(zReportQuery.data.payments.upi.amount)}</span>
                </div>
              </div>

              {/* Cash Reconciliation */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2.5 space-y-1 text-xs">
                <span className="font-bold text-amber-950 block">Cash Drawer Audit</span>
                <div className="flex justify-between text-[11px]">
                  <span>Cash Sales:</span>
                  <span className="font-mono font-semibold">{formatRupee(zReportQuery.data.drawerReconciliation.cashRevenue)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Petty Cash Expenses:</span>
                  <span className="font-mono text-red-600">-{formatRupee(zReportQuery.data.drawerReconciliation.totalPettyCashExpenses)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold border-t pt-1">
                  <span>Expected in Drawer:</span>
                  <span className="font-mono">{formatRupee(zReportQuery.data.drawerReconciliation.expectedCashInDrawer)}</span>
                </div>
                <div className="flex justify-between text-[11px] font-bold">
                  <span>Actual Count Dropped:</span>
                  <span className="font-mono text-emerald-700">{formatRupee(zReportQuery.data.drawerReconciliation.actualCashCollected)}</span>
                </div>
              </div>

              {/* Thermal Print Action */}
              <Button
                className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs h-10 gap-2 font-semibold"
                onClick={handlePrintZReport}
              >
                <Printer className="h-4 w-4" />
                Print Thermal Z-Report Slip (80mm / 58mm)
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
