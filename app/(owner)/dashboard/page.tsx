"use client";

import { trpc } from "@/lib/trpc-client";
import { formatRupee, formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  IndianRupee,
  Store,
  AlertTriangle,
  ClipboardCheck,
  Receipt,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const overview = trpc.dashboard.getOverview.useQuery();
  const kioskStatus = trpc.dashboard.getKioskStatus.useQuery();
  const recentBills = trpc.dashboard.getRecentBills.useQuery({ limit: 8 });
  const alerts = trpc.dashboard.getAlerts.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of all kiosks</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))
        ) : overview.data ? (
          <>
            <StatCard
              title="Today's Revenue"
              value={formatRupee(overview.data.todayRevenue)}
              icon={<IndianRupee className="h-4 w-4 text-green-600" />}
              subtitle={`${overview.data.todayBills} bills`}
            />
            <StatCard
              title="Active Kiosks"
              value={`${overview.data.todayDispatches}/${overview.data.activeKiosks}`}
              icon={<Store className="h-4 w-4 text-blue-600" />}
              subtitle="dispatched today"
            />
            <StatCard
              title="Pending Reconciliation"
              value={String(overview.data.pendingReconciliations)}
              icon={<ClipboardCheck className="h-4 w-4 text-orange-600" />}
              subtitle="awaiting settlement"
            />
            <StatCard
              title="Today's Losses"
              value={formatRupee(overview.data.todayLosses)}
              icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
              subtitle="from reconciliations"
            />
          </>
        ) : null}
      </div>

      {/* Alerts */}
      {alerts.data && (alerts.data.notDispatched.length > 0 || alerts.data.overdueRecons.length > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.data.notDispatched.length > 0 && (
              <p className="text-sm text-amber-700">
                <strong>Not dispatched today:</strong>{" "}
                {alerts.data.notDispatched.map((k) => k.name).join(", ")}
              </p>
            )}
            {alerts.data.overdueRecons.length > 0 && (
              <p className="text-sm text-amber-700">
                <strong>Overdue reconciliations:</strong>{" "}
                {alerts.data.overdueRecons.map((r) => `${r.kioskName} (${formatDate(r.date)})`).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kiosk Status Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Kiosk Status</CardTitle>
          </CardHeader>
          <CardContent>
            {kioskStatus.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kiosk</TableHead>
                    <TableHead>Operator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kioskStatus.data?.map((kiosk) => (
                    <TableRow key={kiosk.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{kiosk.name}</p>
                          <p className="text-xs text-muted-foreground">{kiosk.location}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{kiosk.operatorName}</TableCell>
                      <TableCell>
                        {!kiosk.dispatched ? (
                          <Badge variant="outline" className="text-gray-500 border-gray-300">
                            No Dispatch
                          </Badge>
                        ) : kiosk.reconciled ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Reconciled
                          </Badge>
                        ) : kiosk.dispatchStatus === "CONFIRMED" ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatRupee(kiosk.todayRevenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Recent Bills
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBills.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {recentBills.data?.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{bill.kiosk.name}</p>
                      <p className="text-xs text-muted-foreground">
                        #{bill.billNumber} · {bill.paymentMode}
                      </p>
                    </div>
                    <span className="font-medium text-sm">
                      {formatRupee(bill.total)}
                    </span>
                  </div>
                ))}
                {recentBills.data?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No bills today
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
