"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Download, TrendingUp, Share2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const revenueChart = trpc.dashboard.getRevenueChart.useQuery({ days });
  const kioskStatus = trpc.dashboard.getKioskStatus.useQuery();
  const eodSummary = trpc.whatsapp.getEodSummary.useQuery(undefined, {
    enabled: isWhatsappOpen,
  });

  const exportCSV = () => {
    if (!kioskStatus.data) return;
    const headers = ["Kiosk", "Type", "Location", "Operator", "Revenue Today"];
    const rows = kioskStatus.data.map((k) => [
      k.name,
      k.type,
      k.location,
      k.operatorName,
      k.todayRevenue,
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kiosk-report-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (eodSummary.data?.messageText) {
      navigator.clipboard.writeText(eodSummary.data.messageText);
      setCopied(true);
      toast.success("EOD Summary copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm">Performance data and daily owner summaries</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold gap-1.5"
            onClick={() => setIsWhatsappOpen(true)}
          >
            <Share2 className="h-4 w-4" /> WhatsApp EOD Summary
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 14, 30].map((d) => (
          <Button
            key={d}
            variant={days === d ? "default" : "outline"}
            size="sm"
            onClick={() => setDays(d)}
          >
            {d} Days
          </Button>
        ))}
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Revenue Trend ({days} days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueChart.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChart.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  }
                  fontSize={12}
                />
                <YAxis
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value) => [formatRupee(Number(value)), "Revenue"]}
                  labelFormatter={(label) => formatDate(label)}
                />
                <Bar dataKey="revenue" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Kiosk Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kiosk Performance (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          {kioskStatus.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kioskStatus.data?.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell>{k.location}</TableCell>
                    <TableCell>{k.operatorName}</TableCell>
                    <TableCell className="text-right">{k.billCount}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupee(k.todayRevenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* WhatsApp EOD Dialog Preview */}
      <Dialog open={isWhatsappOpen} onOpenChange={setIsWhatsappOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-emerald-600" />
              Nightly Owner WhatsApp P&L
            </DialogTitle>
            <DialogDescription>
              Preview of automated 9:00 PM executive summary with sales, cash/UPI splits, and shortage alerts.
            </DialogDescription>
          </DialogHeader>

          {eodSummary.isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Generating summary...</p>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 font-mono text-xs text-slate-800 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed shadow-xs">
                {eodSummary.data?.messageText}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-xs" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 mr-1 text-emerald-600" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? "Copied" : "Copy Text"}
                </Button>

                {eodSummary.data?.whatsappLink && (
                  <Button
                    className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-700 font-semibold"
                    onClick={() => eodSummary.data?.whatsappLink && window.open(eodSummary.data.whatsappLink, "_blank")}
                  >
                    Open in WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
