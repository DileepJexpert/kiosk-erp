import { db } from "@/lib/db";
import { AttendanceStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";

export async function checkIn(
  operatorId: string,
  kioskId: string,
  date: Date,
  lat?: number,
  lng?: number
) {
  const existing = await db.attendance.findUnique({
    where: { operatorId_date: { operatorId, date } },
  });

  if (existing) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Attendance already recorded for today",
    });
  }

  // Geo-fence check
  let geoWarning: string | null = null;
  if (lat != null && lng != null) {
    const kiosk = await db.kiosk.findUnique({ where: { id: kioskId } });
    if (kiosk?.latitude && kiosk?.longitude) {
      const distance = haversineDistance(lat, lng, kiosk.latitude, kiosk.longitude);
      if (distance > kiosk.geoFenceRadius) {
        geoWarning = `Check-in is ${Math.round(distance)}m away from kiosk (limit: ${kiosk.geoFenceRadius}m)`;
      }
    }
  }

  const attendance = await db.attendance.create({
    data: {
      operatorId,
      kioskId,
      date,
      status: "PRESENT",
      checkInAt: new Date(),
      checkInLat: lat,
      checkInLng: lng,
    },
  });

  return { attendance, geoWarning };
}

export async function checkOut(
  operatorId: string,
  date: Date,
  lat?: number,
  lng?: number
) {
  const attendance = await db.attendance.findUnique({
    where: { operatorId_date: { operatorId, date } },
  });

  if (!attendance) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No check-in found for today",
    });
  }

  if (attendance.checkOutAt) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Already checked out",
    });
  }

  const checkOutTime = new Date();
  const hoursWorked =
    (checkOutTime.getTime() - (attendance.checkInAt?.getTime() || 0)) / (1000 * 60 * 60);

  return db.attendance.update({
    where: { id: attendance.id },
    data: {
      checkOutAt: checkOutTime,
      checkOutLat: lat,
      checkOutLng: lng,
      status: hoursWorked < 4 ? "HALF_DAY" : "PRESENT",
    },
  });
}

export async function markAttendance(
  operatorId: string,
  kioskId: string,
  date: Date,
  status: AttendanceStatus,
  notes?: string,
  isSubstitute?: boolean
) {
  return db.attendance.upsert({
    where: { operatorId_date: { operatorId, date } },
    create: { operatorId, kioskId, date, status, notes, isSubstitute: isSubstitute || false },
    update: { status, notes, isSubstitute: isSubstitute || false },
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

// Haversine formula for distance between two lat/lng points in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
