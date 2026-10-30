import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "down";
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "up";
  } catch {
    dbStatus = "error";
  }

  const isHealthy = dbStatus === "up";
  const status = isHealthy ? 200 : 503;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      environment: process.env.NODE_ENV || "development",
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatencyMs,
        },
        memory: {
          heapUsedMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
          heapTotalMb: Math.round(process.memoryUsage().heapTotal / (1024 * 1024)),
          rssMb: Math.round(process.memoryUsage().rss / (1024 * 1024)),
        },
      },
      durationMs: Date.now() - startTime,
    },
    { status }
  );
}
