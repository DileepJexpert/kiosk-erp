"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate, getToday } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Banknote, CheckCircle, AlertTriangle, TrendingDown } from "lucide-react";
import { toast } from "sonner";

export default function CashCollectionPage() {
  const [kioskId, setKioskId] = useState<string>("");
  const today = getToday();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [startDate, setStartDate] = useState(sevenDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const kiosks = trpc.kiosk.list.useQuery();

  const collections = trpc.cashCollection.list.useQuery({
    kioskId: kioskId || undefined,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const verifyMutation = trpc.cashCollection.verify.useMutation({
    onSuccess: () => {
      toast.success("Collection verified");
      collections.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "PENDING": return <Badge variant="outline">Pending</Badge>;
      case "COLLECTED": return <Badge className="bg-blue-100 text-blue-700">Collected</Badge>;
      case "VERIFIED": return <Badge className="bg-green-100 text-green-700">Verified</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cash Collection</h1>
        <p className="text-muted-foreground">Track daily cash handovers from kiosks</p>
      </div>

      {/* Summary Cards */}
      {collections.data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Expected</span>
              </div>
              <p className="text-xl font-bold mt-1">{formatRupee(collections.data.totalExpected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Collected</span>
              </div>
              <p className="text-xl font-bold mt-1">{formatRupee(collections.data.totalCollected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-muted-foreground">Difference</span>
              </div>
              <p className={`text-xl font-bold mt-1 ${collections.data.totalDifference < 0 ? "text-red-600" : "text-green-600"}`}>
                {formatRupee(collections.data.totalDifference)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">Shortages</span>
              </div>
              <p className="text-xl font-bold mt-1">{collections.data.shortages}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={kioskId} onValueChange={setKioskId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All kiosks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Kiosks</SelectItem>
            {kiosks.data?.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collection Records</CardTitle>
        </CardHeader>
        <CardContent>
          {collections.isLoading ? (
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
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="text-right">Collected</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.data?.collections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDate(c.date)}</TableCell>
                    <TableCell className="font-medium">{c.kiosk.name}</TableCell>
                    <TableCell>{c.operator.name}</TableCell>
                    <TableCell className="text-right">{formatRupee(c.expectedCash)}</TableCell>
                    <TableCell className="text-right">{formatRupee(c.collectedCash)}</TableCell>
                    <TableCell className={`text-right font-medium ${c.difference < 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatRupee(c.difference)}
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell>
                      {c.status === "COLLECTED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => verifyMutation.mutate({ collectionId: c.id })}
                          disabled={verifyMutation.isPending}
                        >
                          Verify
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {collections.data?.collections.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No collection records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
