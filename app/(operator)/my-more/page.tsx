"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate, getCurrentMonth, getToday } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarCheck, CreditCard, Wallet, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  FUEL_GAS: "Gas/Fuel",
  LOCAL_PURCHASE: "Local Purchase",
  REPAIR: "Repair",
  LOCATION_RENT: "Location Rent",
  CLEANING: "Cleaning",
  TRANSPORT: "Transport",
  MISCELLANEOUS: "Other",
};

export default function MyMorePage() {
  const today = getToday();
  const month = getCurrentMonth();
  const profile = trpc.user.getProfile.useQuery();
  const kioskId = profile.data?.assignedKiosk?.id;

  // Attendance
  const todayAttendance = trpc.attendance.getToday.useQuery();
  const monthlyAttendance = trpc.attendance.getMyMonthly.useQuery({ month });

  const checkInMutation = trpc.attendance.checkIn.useMutation({
    onSuccess: () => {
      toast.success("Checked in!");
      todayAttendance.refetch();
      monthlyAttendance.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const checkOutMutation = trpc.attendance.checkOut.useMutation({
    onSuccess: () => {
      toast.success("Checked out!");
      todayAttendance.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Expenses
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expAmount, setExpAmount] = useState("");
  const [expCategory, setExpCategory] = useState("");
  const [expDescription, setExpDescription] = useState("");

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const myExpenses = trpc.expense.myExpenses.useQuery({
    startDate: thirtyDaysAgo,
    endDate: today,
  });

  const createExpense = trpc.expense.create.useMutation({
    onSuccess: () => {
      toast.success("Expense recorded!");
      setExpenseOpen(false);
      setExpAmount(""); setExpCategory(""); setExpDescription("");
      myExpenses.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Salary
  const mySalary = trpc.salary.getOperatorSalary.useQuery({ month });

  const handleExpense = () => {
    if (!kioskId || !expAmount || !expCategory || !expDescription) return;
    createExpense.mutate({
      kioskId,
      date: today,
      amount: parseFloat(expAmount),
      category: expCategory as any,
      description: expDescription,
    });
  };

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold">More</h1>

      {/* Attendance Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Today's status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Today</p>
              {todayAttendance.data ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-700">{todayAttendance.data.status}</Badge>
                  {todayAttendance.data.checkInAt && (
                    <span className="text-xs text-muted-foreground">
                      In: {new Date(todayAttendance.data.checkInAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {todayAttendance.data.checkOutAt && (
                    <span className="text-xs text-muted-foreground">
                      Out: {new Date(todayAttendance.data.checkOutAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not checked in</p>
              )}
            </div>
            <div>
              {!todayAttendance.data ? (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => kioskId && checkInMutation.mutate({ kioskId })}
                  disabled={!kioskId || checkInMutation.isPending}
                >
                  <UserCheck className="h-3 w-3 mr-1" /> Check In
                </Button>
              ) : !todayAttendance.data.checkOutAt ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => checkOutMutation.mutate()}
                  disabled={checkOutMutation.isPending}
                >
                  <UserX className="h-3 w-3 mr-1" /> Check Out
                </Button>
              ) : null}
            </div>
          </div>

          {/* Monthly summary */}
          {monthlyAttendance.data?.summary && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-lg font-bold text-green-600">{monthlyAttendance.data.summary.present}</p>
                <p className="text-[10px] text-muted-foreground">Present</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-red-600">{monthlyAttendance.data.summary.absent}</p>
                <p className="text-[10px] text-muted-foreground">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-amber-600">{monthlyAttendance.data.summary.halfDay}</p>
                <p className="text-[10px] text-muted-foreground">Half Day</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{monthlyAttendance.data.summary.leave}</p>
                <p className="text-[10px] text-muted-foreground">Leave</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Salary Card */}
      {mySalary.data && (
        <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm opacity-80">This Month's Salary</p>
            <p className="text-3xl font-bold mt-1">{formatRupee(mySalary.data.netSalary)}</p>
            <div className="flex gap-4 mt-2 text-xs opacity-80">
              <span>Base: {formatRupee(mySalary.data.baseSalary)}</span>
              <span>Losses: -{formatRupee(mySalary.data.totalLossDed)}</span>
              <span>Status: {mySalary.data.status}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Expenses
            </CardTitle>
            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">Add Expense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Record Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={expCategory} onValueChange={setExpCategory}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={expDescription}
                      onChange={(e) => setExpDescription(e.target.value)}
                      placeholder="What was the expense for?"
                    />
                  </div>
                  <Button onClick={handleExpense} disabled={createExpense.isPending} className="w-full">
                    {createExpense.isPending ? "Saving..." : "Save Expense"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {myExpenses.data?.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[e.category]} · {formatDate(e.date)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{formatRupee(e.amount)}</p>
                  <Badge className={`text-[10px] ${e.approved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {e.approved ? "Approved" : "Pending"}
                  </Badge>
                </div>
              </div>
            ))}
            {myExpenses.data?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No expenses this month</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
