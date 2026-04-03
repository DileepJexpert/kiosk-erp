"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, getCurrentMonth, formatMonth } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calculator, Check, CreditCard, Plus } from "lucide-react";
import { toast } from "sonner";

export default function SalaryPage() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const utils = trpc.useUtils();

  const salaries = trpc.salary.list.useQuery({ month });
  const operators = trpc.user.list.useQuery({ role: "OPERATOR" });

  const generate = trpc.salary.generate.useMutation({
    onSuccess: () => {
      utils.salary.list.invalidate();
      toast.success("Salaries generated");
    },
    onError: (err) => toast.error(err.message),
  });

  const finalize = trpc.salary.finalize.useMutation({
    onSuccess: () => {
      utils.salary.list.invalidate();
      toast.success("Salary finalized");
    },
  });

  const markPaid = trpc.salary.markPaid.useMutation({
    onSuccess: () => {
      utils.salary.list.invalidate();
      toast.success("Marked as paid");
    },
  });

  const addAdvance = trpc.salary.addAdvance.useMutation({
    onSuccess: () => {
      utils.salary.list.invalidate();
      setAdvanceOpen(false);
      toast.success("Advance recorded");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAdvance = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    addAdvance.mutate({
      operatorId: fd.get("operatorId") as string,
      amount: parseFloat(fd.get("amount") as string),
      date: new Date(),
      notes: (fd.get("notes") as string) || undefined,
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-600 hover:bg-gray-100";
      case "FINALIZED": return "bg-blue-100 text-blue-700 hover:bg-blue-100";
      case "PAID": return "bg-green-100 text-green-700 hover:bg-green-100";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salary Management</h1>
          <p className="text-muted-foreground">Monthly salary computation and payroll</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={advanceOpen} onOpenChange={setAdvanceOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Record Advance</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Advance</DialogTitle></DialogHeader>
              <form onSubmit={handleAdvance} className="space-y-4">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <select name="operatorId" className="w-full border rounded-md px-3 py-2 text-sm" required>
                    <option value="">Select operator...</option>
                    {operators.data?.filter(o => o.role === "OPERATOR" && o.isActive).map((op) => (
                      <option key={op.id} value={op.id}>{op.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input name="amount" type="number" required min="1" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input name="notes" placeholder="Reason for advance" />
                </div>
                <Button type="submit" className="w-full" disabled={addAdvance.isPending}>
                  {addAdvance.isPending ? "Recording..." : "Record Advance"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => generate.mutate({ month, baseSalary: 12000 })}
            disabled={generate.isPending}
          >
            <Calculator className="h-4 w-4 mr-1" />
            {generate.isPending ? "Generating..." : "Generate Salaries"}
          </Button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-4">
        <Label>Month:</Label>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48"
        />
        <span className="text-sm text-muted-foreground">{formatMonth(month)}</span>
      </div>

      <Card>
        <CardContent className="pt-6">
          {salaries.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Kiosk</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">Losses</TableHead>
                  <TableHead className="text-right">Advances</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaries.data?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.operator.name}</TableCell>
                    <TableCell>{s.operator.assignedKiosk?.name || "—"}</TableCell>
                    <TableCell className="text-right">{formatRupee(s.baseSalary)}</TableCell>
                    <TableCell className="text-right">
                      {s.totalLossDed > 0 ? (
                        <span className="text-red-600">-{formatRupee(s.totalLossDed)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.totalAdvanceDed > 0 ? (
                        <span className="text-orange-600">-{formatRupee(s.totalAdvanceDed)}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.bonus > 0 ? <span className="text-green-600">+{formatRupee(s.bonus)}</span> : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold">{formatRupee(s.netSalary)}</TableCell>
                    <TableCell>
                      <Badge className={statusColor(s.status)}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {s.status === "DRAFT" && (
                        <Button variant="ghost" size="sm" onClick={() => finalize.mutate({ id: s.id })}>
                          <Check className="h-3 w-3 mr-1" /> Finalize
                        </Button>
                      )}
                      {s.status === "FINALIZED" && (
                        <Button variant="ghost" size="sm" onClick={() => markPaid.mutate({ id: s.id })}>
                          <CreditCard className="h-3 w-3 mr-1" /> Pay
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {salaries.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No salary records for {formatMonth(month)}. Click "Generate Salaries" to compute.
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
