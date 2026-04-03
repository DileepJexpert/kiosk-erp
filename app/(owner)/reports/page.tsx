"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { Download, TrendingUp } from "lucide-react";

export default function ReportsPage() {
  const [days, setDays] = useState(7);
  const revenueChart = trpc.dashboard.getRevenueChart.useQuery({ days });
  const kioskStatus = trpc.dashboard.getKioskStatus.useQuery();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analytics and performance data</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
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
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
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
    </div>
  );
}
