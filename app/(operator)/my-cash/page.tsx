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
import { Banknote, CheckCircle, ShieldCheck, Calculator } from "lucide-react";
import { toast } from "sonner";

export default function MyCashPage() {
  const [c500, setC500] = useState("");
  const [c200, setC200] = useState("");
  const [c100, setC100] = useState("");
  const [c50, setC50] = useState("");
  const [c20, setC20] = useState("");
  const [c10, setC10] = useState("");
  const [coins, setCoins] = useState("");
  const [shortageReason, setShortageReason] = useState("");

  const today = getToday();
  const profile = trpc.user.getProfile.useQuery();
  const kioskId = profile.data?.assignedKiosk?.id;

  const todayCollection = trpc.cashCollection.getByDate.useQuery(
    { kioskId: kioskId!, date: today },
    { enabled: !!kioskId }
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
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Banknote className="h-5 w-5 text-emerald-600" />
          Blind Cash Drop & Handover
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Anti-theft protocol: count drawer currency blindly. Discrepancy is audited directly by management.
        </p>
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
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <div>
                <h3 className="font-bold text-emerald-950 text-base">Blind Cash Drop Submitted</h3>
                <p className="text-xs text-emerald-700">
                  Recorded on {new Date(todayCollection.data.createdAt).toLocaleTimeString("en-IN")}
                </p>
              </div>
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
    </div>
  );
}
