"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatDate, getCurrentMonth } from "@/lib/utils";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarCheck, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

export default function AttendancePage() {
  const [selectedOperator, setSelectedOperator] = useState<string>("");
  const [month, setMonth] = useState(getCurrentMonth());
  const [markOpen, setMarkOpen] = useState(false);
  const [markDate, setMarkDate] = useState("");
  const [markStatus, setMarkStatus] = useState<string>("PRESENT");
  const [markNotes, setMarkNotes] = useState("");
  const [markOperatorId, setMarkOperatorId] = useState("");
  const [markKioskId, setMarkKioskId] = useState("");

  const operators = trpc.user.list.useQuery({ role: "OPERATOR" as any });
  const kiosks = trpc.kiosk.list.useQuery();

  const attendance = trpc.attendance.getMonthly.useQuery(
    { operatorId: selectedOperator, month },
    { enabled: !!selectedOperator }
  );

  const markAttendance = trpc.attendance.markAttendance.useMutation({
    onSuccess: () => {
      toast.success("Attendance marked");
      setMarkOpen(false);
      attendance.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleMark = () => {
    if (!markOperatorId || !markDate || !markKioskId) return;
    const dateObj = new Date(markDate);
    dateObj.setHours(0, 0, 0, 0);
    markAttendance.mutate({
      operatorId: markOperatorId,
      kioskId: markKioskId,
      date: dateObj,
      status: markStatus as any,
      notes: markNotes || undefined,
    });
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "PRESENT": return "bg-green-100 text-green-700";
      case "ABSENT": return "bg-red-100 text-red-700";
      case "HALF_DAY": return "bg-amber-100 text-amber-700";
      case "LEAVE": return "bg-blue-100 text-blue-700";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track operator attendance</p>
        </div>
        <Dialog open={markOpen} onOpenChange={setMarkOpen}>
          <DialogTrigger asChild>
            <Button>Mark Attendance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark Attendance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Operator</Label>
                <Select value={markOperatorId} onValueChange={setMarkOperatorId}>
                  <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
                  <SelectContent>
                    {operators.data?.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Kiosk</Label>
                <Select value={markKioskId} onValueChange={setMarkKioskId}>
                  <SelectTrigger><SelectValue placeholder="Select kiosk" /></SelectTrigger>
                  <SelectContent>
                    {kiosks.data?.map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={markDate} onChange={(e) => setMarkDate(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={markStatus} onValueChange={setMarkStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="HALF_DAY">Half Day</SelectItem>
                    <SelectItem value="LEAVE">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={markNotes} onChange={(e) => setMarkNotes(e.target.value)} />
              </div>
              <Button onClick={handleMark} disabled={markAttendance.isPending} className="w-full">
                {markAttendance.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="w-48">
          <Select value={selectedOperator} onValueChange={setSelectedOperator}>
            <SelectTrigger><SelectValue placeholder="Select operator" /></SelectTrigger>
            <SelectContent>
              {operators.data?.map((op) => (
                <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Summary Cards */}
      {attendance.data?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm text-muted-foreground">Present</span>
              </div>
              <p className="text-2xl font-bold mt-1">{attendance.data.summary.present}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                <span className="text-sm text-muted-foreground">Absent</span>
              </div>
              <p className="text-2xl font-bold mt-1">{attendance.data.summary.absent}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-muted-foreground">Half Day</span>
              </div>
              <p className="text-2xl font-bold mt-1">{attendance.data.summary.halfDay}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-muted-foreground">Leave</span>
              </div>
              <p className="text-2xl font-bold mt-1">{attendance.data.summary.leave}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Records Table */}
      {selectedOperator ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attendance Records</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.isLoading ? (
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
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.data?.records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>
                        <Badge className={statusColor(record.status)}>{record.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {record.checkIn
                          ? new Date(record.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.checkOut
                          ? new Date(record.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {attendance.data?.records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select an operator to view attendance records
          </CardContent>
        </Card>
      )}
    </div>
  );
}
