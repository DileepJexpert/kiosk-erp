"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { getCurrentMonth, formatMonth } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingUp, Star } from "lucide-react";

export default function PerformancePage() {
  const [month, setMonth] = useState(getCurrentMonth());

  const leaderboard = trpc.performance.getLeaderboard.useQuery({ month });

  const ratingColor = (rating: string) => {
    switch (rating) {
      case "EXCELLENT": return "bg-green-100 text-green-700";
      case "GOOD": return "bg-blue-100 text-blue-700";
      case "AVERAGE": return "bg-amber-100 text-amber-700";
      case "NEEDS_ATTENTION": return "bg-red-100 text-red-700";
      default: return "";
    }
  };

  const scoreBar = (score: number, color: string) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{score}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Scoring</h1>
          <p className="text-muted-foreground">Operator performance leaderboard for {formatMonth(month)}</p>
        </div>
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-48"
        />
      </div>

      {/* Top 3 Podium */}
      {leaderboard.data && leaderboard.data.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {leaderboard.data.slice(0, 3).map((op, idx) => (
            <Card key={op.operatorId} className={idx === 0 ? "border-yellow-300 bg-yellow-50" : ""}>
              <CardContent className="pt-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  {idx === 0 ? (
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  ) : idx === 1 ? (
                    <Star className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Star className="h-5 w-5 text-amber-600" />
                  )}
                </div>
                <p className="font-bold">{op.operatorName}</p>
                <p className="text-xs text-muted-foreground">{op.kioskName}</p>
                <p className="text-3xl font-bold mt-2">{op.totalScore}</p>
                <Badge className={`mt-1 ${ratingColor(op.rating)}`}>{op.rating}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Detailed Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Kiosk</TableHead>
                  <TableHead>Wastage (30%)</TableHead>
                  <TableHead>Revenue (25%)</TableHead>
                  <TableHead>Attendance (15%)</TableHead>
                  <TableHead>Timeliness (15%)</TableHead>
                  <TableHead>Cash (15%)</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.data?.map((op, idx) => (
                  <TableRow key={op.operatorId}>
                    <TableCell className="font-bold">{idx + 1}</TableCell>
                    <TableCell className="font-medium">{op.operatorName}</TableCell>
                    <TableCell className="text-sm">{op.kioskName}</TableCell>
                    <TableCell>{scoreBar(op.wastageScore, "bg-green-500")}</TableCell>
                    <TableCell>{scoreBar(op.revenueScore, "bg-blue-500")}</TableCell>
                    <TableCell>{scoreBar(op.attendanceScore, "bg-purple-500")}</TableCell>
                    <TableCell>{scoreBar(op.timelinessScore, "bg-amber-500")}</TableCell>
                    <TableCell>{scoreBar(op.cashAccuracyScore, "bg-teal-500")}</TableCell>
                    <TableCell className="text-right text-lg font-bold">{op.totalScore}</TableCell>
                    <TableCell>
                      <Badge className={ratingColor(op.rating)}>{op.rating}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {leaderboard.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      No performance data for this month
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
