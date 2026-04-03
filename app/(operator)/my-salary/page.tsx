"use client";

import { trpc } from "@/lib/trpc-client";
import { formatRupee, getCurrentMonth, formatMonth } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingDown, ArrowDown, Gift } from "lucide-react";

export default function MySalaryPage() {
  const month = getCurrentMonth();
  const salary = trpc.salary.getOperatorSalary.useQuery({ month });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Salary</h1>
      <p className="text-sm text-muted-foreground">{formatMonth(month)}</p>

      {salary.isLoading ? (
        <Skeleton className="h-72" />
      ) : !salary.data ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No salary record</p>
            <p className="text-sm text-muted-foreground">
              Salary for {formatMonth(month)} has not been generated yet
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Net Salary Card */}
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="py-6 text-center">
              <p className="text-sm opacity-90">Net Salary</p>
              <p className="text-4xl font-bold mt-1">{formatRupee(salary.data.netSalary)}</p>
              <p className="text-xs mt-2 opacity-75">
                Status: {salary.data.status}
              </p>
            </CardContent>
          </Card>

          {/* Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-500" />
                  Base Salary
                </span>
                <span className="font-medium">{formatRupee(salary.data.baseSalary)}</span>
              </div>

              {salary.data.totalLossDed > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Loss Deductions
                  </span>
                  <span className="font-medium text-red-600">-{formatRupee(salary.data.totalLossDed)}</span>
                </div>
              )}

              {salary.data.totalAdvanceDed > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm flex items-center gap-2">
                    <ArrowDown className="h-4 w-4 text-orange-500" />
                    Advance Deductions
                  </span>
                  <span className="font-medium text-orange-600">-{formatRupee(salary.data.totalAdvanceDed)}</span>
                </div>
              )}

              {salary.data.bonus > 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm flex items-center gap-2">
                    <Gift className="h-4 w-4 text-green-500" />
                    Bonus
                  </span>
                  <span className="font-medium text-green-600">+{formatRupee(salary.data.bonus)}</span>
                </div>
              )}

              {salary.data.adjustments !== 0 && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-sm">Adjustments</span>
                  <span className="font-medium">{formatRupee(salary.data.adjustments)}</span>
                </div>
              )}

              <div className="flex justify-between py-2 border-t-2 font-bold">
                <span>Net Pay</span>
                <span className="text-lg">{formatRupee(salary.data.netSalary)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
