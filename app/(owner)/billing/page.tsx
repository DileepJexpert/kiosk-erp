"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatDate, formatRupee } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Eye, Printer } from "lucide-react";

export default function BillingPage() {
  const [receiptBillId, setReceiptBillId] = useState<string | null>(null);
  const bills = trpc.billing.list.useQuery();
  const receipt = trpc.billing.getReceipt.useQuery(
    { billId: receiptBillId! },
    { enabled: !!receiptBillId }
  );

  const handlePrint = () => {
    window.print();
  };

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
                  <TableHead className="text-right">Actions</TableHead>
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setReceiptBillId(bill.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {bills.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No bills found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptBillId} onOpenChange={(v) => !v && setReceiptBillId(null)}>
        <DialogContent className="max-w-md print:shadow-none print:border-none">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {receipt.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : receipt.data ? (
            <div className="space-y-4 print:text-black" id="receipt-content">
              <div className="text-center border-b pb-3">
                <p className="font-bold text-lg">{receipt.data.kiosk.name}</p>
                <p className="text-sm text-muted-foreground">{formatDate(receipt.data.date)}</p>
                <p className="text-sm font-mono">Bill #{receipt.data.billNumber}</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.data.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">{item.item.name}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm">{formatRupee(item.unitPrice)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatRupee(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="border-t pt-3 space-y-1">
                {receipt.data.subtotal > 0 && receipt.data.subtotal !== receipt.data.total && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatRupee(receipt.data.subtotal)}</span>
                  </div>
                )}
                {(receipt.data.cgstAmount > 0 || receipt.data.sgstAmount > 0) && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST</span>
                      <span>{formatRupee(receipt.data.cgstAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST</span>
                      <span>{formatRupee(receipt.data.sgstAmount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatRupee(receipt.data.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payment Mode</span>
                  <Badge className={paymentColor(receipt.data.paymentMode)}>
                    {receipt.data.paymentMode}
                  </Badge>
                </div>
                {receipt.data.upiTransactionRef && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">UPI Ref</span>
                    <span className="font-mono text-xs">{receipt.data.upiTransactionRef}</span>
                  </div>
                )}
                {receipt.data.orderChannel && receipt.data.orderChannel !== "WALK_IN" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Channel</span>
                    <span>{receipt.data.orderChannel}</span>
                  </div>
                )}
              </div>

              {receipt.data.kiosk.gstin && (
                <div className="text-center text-xs text-muted-foreground border-t pt-2">
                  <p>GSTIN: {receipt.data.kiosk.gstin}</p>
                </div>
              )}

              <Button className="w-full print:hidden" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" /> Print
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
