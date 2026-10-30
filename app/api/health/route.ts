import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "down";
  let dbLatencyMs = 0;

  let userCount = 0;
  let dbError: string | null = null;
  let dbInfo: any = null;
  let tableList: string[] = [];

  try {
    const dbStart = Date.now();
    await db.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;

    const infoResult: any = await db.$queryRaw`SELECT current_database() as db, current_schema() as schema, current_user as user;`;
    dbInfo = infoResult[0] || null;

    const tablesResult: any = await db.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' LIMIT 20;`;
    tableList = tablesResult.map((t: any) => t.table_name);

    userCount = await db.user.count();
    dbStatus = "up";
  } catch (e: any) {
    dbStatus = "error";
    dbError = e instanceof Error ? e.message : String(e);
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
          userCount,
          dbInfo,
          tablesFound: tableList,
          error: dbError,
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
