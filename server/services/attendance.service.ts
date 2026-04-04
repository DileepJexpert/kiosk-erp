import { db } from "@/lib/db";
import { AttendanceStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export async function checkIn(operatorId: string, kioskId: string, date: Date) {
  const existing = await db.attendance.findUnique({
    where: { operatorId_date: { operatorId, date } },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Attendance already recorded for today",
    });
  }

  return db.attendance.create({
    data: {
      operatorId,
      kioskId,
      date,
      status: "PRESENT",
      checkIn: new Date(),
    },
  });
}

export async function checkOut(operatorId: string, date: Date) {
  const attendance = await db.attendance.findUnique({
    where: { operatorId_date: { operatorId, date } },
  });

  if (!attendance) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No check-in found for today",
    });
  }

  if (attendance.checkOut) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Already checked out",
    });
  }

  const checkOutTime = new Date();
  const hoursWorked =
    (checkOutTime.getTime() - (attendance.checkIn?.getTime() || 0)) / (1000 * 60 * 60);

  return db.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOut: checkOutTime,
      status: hoursWorked < 4 ? "HALF_DAY" : "PRESENT",
    },
  });
}

export async function markAttendance(
  operatorId: string,
  kioskId: string,
  date: Date,
  status: AttendanceStatus,
  notes?: string
) {
  return db.attendance.upsert({
    where: { operatorId_date: { operatorId, date } },
    create: { operatorId, kioskId, date, status, notes },
    update: { status, notes },
  });
}

export async function getMonthlyAttendance(operatorId: string, month: string) {
  const [year, m] = month.split("-").map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);

  const records = await db.attendance.findMany({
    where: {
      operatorId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "asc" },
  });

  const summary = {
    present: records.filter((r) => r.status === "PRESENT").length,
    absent: records.filter((r) => r.status === "ABSENT").length,
    halfDay: records.filter((r) => r.status === "HALF_DAY").length,
    leave: records.filter((r) => r.status === "LEAVE").length,
    total: records.length,
  };

  return { records, summary };
}
