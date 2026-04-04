"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, getCurrentMonth } from "@/lib/utils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download } from "lucide-react";

export default function GSTReportsPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [kioskId, setKioskId] = useState("");

  const kiosks = trpc.kiosk.list.useQuery();
  const summary = trpc.gst.getMonthlySummary.useQuery({ month, kioskId: kioskId || undefined });
  const hsnSummary = trpc.gst.getHSNSummary.useQuery({ month, kioskId: kioskId || undefined });
  const gstr1 = trpc.gst.getGSTR1.useQuery({ month, kioskId: kioskId || undefined });

  const exportCSV = () => {
    if (!gstr1.data) return;
    const headers = "Bill Number,Date,Total,Taxable Value,CGST,SGST,Customer GSTIN\n";
    const rows = gstr1.data
      .map((r) => `${r.billNumber},${r.date},${r.total},${r.taxableValue},${r.cgst},${r.sgst},${r.customerGSTIN}`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">GST Reports</h1>
          <p className="text-muted-foreground">Monthly GST summary, HSN breakdown, and GSTR-1 export</p>
        </div>
        <Button onClick={exportCSV} disabled={!gstr1.data?.length}>
          <Download className="h-4 w-4 mr-2" /> Export GSTR-1 CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
        <Select value={kioskId} onValueChange={setKioskId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All kiosks" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Kiosks</SelectItem>
            {kiosks.data?.map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      {summary.data && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total Sales</p>
              <p className="text-lg font-bold">{formatRupee(summary.data.totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Taxable Value</p>
              <p className="text-lg font-bold">{formatRupee(summary.data.taxableValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">Total GST</p>
              <p className="text-lg font-bold">{formatRupee(summary.data.totalGST)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">CGST</p>
              <p className="text-lg font-bold">{formatRupee(summary.data.totalCGST)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">SGST</p>
              <p className="text-lg font-bold">{formatRupee(summary.data.totalSGST)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="hsn">
        <TabsList>
          <TabsTrigger value="hsn">HSN Summary</TabsTrigger>
          <TabsTrigger value="gstr1">GSTR-1 Data</TabsTrigger>
        </TabsList>

        <TabsContent value="hsn" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                HSN-wise Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hsnSummary.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>HSN Code</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">GST Rate</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Taxable Value</TableHead>
                      <TableHead className="text-right">GST Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hsnSummary.data?.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono">{h.hsnCode}</TableCell>
                        <TableCell>{h.itemName}</TableCell>
                        <TableCell className="text-right">{h.gstRate}%</TableCell>
                        <TableCell className="text-right">{h.quantity}</TableCell>
                        <TableCell className="text-right">{formatRupee(h.taxableValue)}</TableCell>
                        <TableCell className="text-right font-medium">{formatRupee(h.gstAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gstr1" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {gstr1.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right">CGST</TableHead>
                      <TableHead className="text-right">SGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstr1.data?.map((r) => (
                      <TableRow key={r.billNumber}>
                        <TableCell className="font-mono">#{r.billNumber}</TableCell>
                        <TableCell>{r.date}</TableCell>
                        <TableCell className="text-right">{formatRupee(r.total)}</TableCell>
                        <TableCell className="text-right">{formatRupee(r.taxableValue)}</TableCell>
                        <TableCell className="text-right">{formatRupee(r.cgst)}</TableCell>
                        <TableCell className="text-right">{formatRupee(r.sgst)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
