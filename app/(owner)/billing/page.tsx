"use client";

import { trpc } from "@/lib/trpc-client";
import { formatDate, formatRupee } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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

export default function BillingPage() {
  const bills = trpc.billing.list.useQuery();

  const paymentColor = (mode: string) => {
    switch (mode) {
      case "CASH": return "bg-green-100 text-green-700 hover:bg-green-100";
      case "UPI": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "MIXED": return "bg-purple-100 text-purple-700 hover:bg-purple-100";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">All bills across kiosks</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {bills.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.data?.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono text-sm">#{bill.billNumber}</TableCell>
                    <TableCell>{formatDate(bill.date)}</TableCell>
                    <TableCell className="font-medium">{bill.kiosk.name}</TableCell>
                    <TableCell>{bill.operator.name}</TableCell>
                    <TableCell>{bill.items.length} items</TableCell>
                    <TableCell>
                      <Badge className={paymentColor(bill.paymentMode)}>{bill.paymentMode}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatRupee(bill.total)}</TableCell>
                  </TableRow>
                ))}
                {bills.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No bills found
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
