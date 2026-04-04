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
import { CreditCard, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  GAS: "Gas/Fuel",
  TRANSPORT: "Transport",
  CLEANING: "Cleaning",
  REPAIR: "Repair",
  SUPPLIES: "Supplies",
  OTHER: "Other",
};

export default function ExpensesPage() {
  const [kioskId, setKioskId] = useState<string>("");
  const today = getToday();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const kiosks = trpc.kiosk.list.useQuery();

  const expenses = trpc.expense.list.useQuery({
    kioskId: kioskId || undefined,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
  });

  const approveMutation = trpc.expense.approve.useMutation({
    onSuccess: () => {
      toast.success("Expense approved");
      expenses.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Expenses</h1>
        <p className="text-muted-foreground">Track and approve kiosk expenses</p>
      </div>

      {/* Summary */}
      {expenses.data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-xl font-bold mt-1">{formatRupee(expenses.data.total)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Approved</span>
              </div>
              <p className="text-xl font-bold mt-1">{formatRupee(expenses.data.approved)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-muted-foreground">Pending</span>
              </div>
              <p className="text-xl font-bold mt-1">{formatRupee(expenses.data.pending)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {expenses.data?.byCategory && Object.keys(expenses.data.byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {Object.entries(expenses.data.byCategory).map(([cat, amount]) => (
                <div key={cat} className="bg-gray-50 rounded-lg px-4 py-2">
                  <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[cat] || cat}</p>
                  <p className="font-bold">{formatRupee(amount as number)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
        <CardContent className="pt-6">
          {expenses.isLoading ? (
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
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.data?.expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{formatDate(e.date)}</TableCell>
                    <TableCell className="font-medium">{e.kiosk.name}</TableCell>
                    <TableCell>{CATEGORY_LABELS[e.category] || e.category}</TableCell>
                    <TableCell className="text-sm">{e.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatRupee(e.amount)}</TableCell>
                    <TableCell>
                      {e.approved ? (
                        <Badge className="bg-green-100 text-green-700">Approved</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-700">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!e.approved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveMutation.mutate({ expenseId: e.id })}
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.data?.expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No expenses found
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
