"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, getToday } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Banknote, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function MyCashPage() {
  const [collectedCash, setCollectedCash] = useState("");
  const [notes, setNotes] = useState("");
  const today = getToday();

  const profile = trpc.user.getProfile.useQuery();
  const kioskId = profile.data?.assignedKiosk?.id;

  const expectedCash = trpc.cashCollection.getExpectedCash.useQuery(
    { kioskId: kioskId!, date: today },
    { enabled: !!kioskId }
  );

  const todayCollection = trpc.cashCollection.getByDate.useQuery(
    { kioskId: kioskId!, date: today },
    { enabled: !!kioskId }
  );

  const recordMutation = trpc.cashCollection.record.useMutation({
    onSuccess: () => {
      toast.success("Cash handover recorded!");
      todayCollection.refetch();
      setCollectedCash("");
      setNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!kioskId || !collectedCash) return;
    recordMutation.mutate({
      kioskId,
      date: today,
      collectedCash: parseFloat(collectedCash),
      notes: notes || undefined,
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
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">Cash Handover</h1>
      <p className="text-sm text-muted-foreground">
        Record today's cash collection for handover
      </p>

      {/* Expected Cash */}
      <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm opacity-80">Expected Cash Today</p>
          <p className="text-3xl font-bold mt-1">
            {expectedCash.isLoading ? "..." : formatRupee(expectedCash.data || 0)}
          </p>
          <p className="text-xs opacity-70 mt-1">Based on cash & mixed payment bills</p>
        </CardContent>
      </Card>

      {/* Already submitted */}
      {todayCollection.data ? (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Cash Handover Recorded</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-xs text-muted-foreground">Collected</p>
                <p className="font-bold">{formatRupee(todayCollection.data.collectedCash)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Difference</p>
                <p className={`font-bold ${todayCollection.data.difference < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatRupee(todayCollection.data.difference)}
                </p>
              </div>
            </div>
            <Badge className="mt-2 bg-green-100 text-green-700">
              {todayCollection.data.status}
            </Badge>
          </CardContent>
        </Card>
      ) : (
        /* Submit Form */
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Record Cash Handover
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cash Amount (₹)</Label>
              <Input
                type="number"
                value={collectedCash}
                onChange={(e) => setCollectedCash(e.target.value)}
                placeholder="Enter cash amount"
                className="text-lg h-12"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any discrepancy notes..."
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!collectedCash || recordMutation.isPending}
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
            >
              {recordMutation.isPending ? "Submitting..." : "Submit Cash Handover"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
