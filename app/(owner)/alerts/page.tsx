"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, BellOff, AlertTriangle, Shield, Zap } from "lucide-react";
import { toast } from "sonner";

export default function AlertsPage() {
  const [severity, setSeverity] = useState<string>("");
  const [fraudDate, setFraudDate] = useState(new Date().toISOString().split("T")[0]);

  const alerts = trpc.alert.list.useQuery({
    severity: severity ? (severity as any) : undefined,
  });

  const unreadCount = trpc.alert.unreadCount.useQuery();

  const markRead = trpc.alert.markRead.useMutation({
    onSuccess: () => {
      alerts.refetch();
      unreadCount.refetch();
    },
  });

  const markAllRead = trpc.alert.markAllRead.useMutation({
    onSuccess: () => {
      toast.success("All alerts marked as read");
      alerts.refetch();
      unreadCount.refetch();
    },
  });

  const runFraudCheck = trpc.alert.runFraudCheck.useMutation({
    onSuccess: (data) => {
      toast.success(`Fraud check complete: ${data.alertsCreated} alerts generated`);
      alerts.refetch();
      unreadCount.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const severityColor = (s: string) => {
    switch (s) {
      case "CRITICAL": return "bg-red-100 text-red-700 border-red-200";
      case "HIGH": return "bg-orange-100 text-orange-700 border-orange-200";
      case "MEDIUM": return "bg-amber-100 text-amber-700 border-amber-200";
      case "LOW": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "";
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "CASH_SHORTAGE": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "HIGH_WASTAGE": return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "LOW_REVENUE": return <Zap className="h-4 w-4 text-amber-500" />;
      default: return <Bell className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alerts & Fraud Detection</h1>
          <p className="text-muted-foreground">
            {unreadCount.data ?? 0} unread alerts
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={fraudDate}
              onChange={(e) => setFraudDate(e.target.value)}
              className="w-44"
            />
            <Button
              variant="outline"
              onClick={() => {
                const d = new Date(fraudDate);
                d.setHours(0, 0, 0, 0);
                runFraudCheck.mutate({ date: d });
              }}
              disabled={runFraudCheck.isPending}
            >
              <Shield className="h-4 w-4 mr-2" />
              {runFraudCheck.isPending ? "Checking..." : "Run Fraud Check"}
            </Button>
          </div>
          {(unreadCount.data ?? 0) > 0 && (
            <Button variant="outline" onClick={() => markAllRead.mutate()}>
              <BellOff className="h-4 w-4 mr-2" /> Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All severities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      {alerts.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.data?.map((alert) => (
            <Card
              key={alert.id}
              className={`${!alert.isRead ? "border-l-4 border-l-orange-400 bg-orange-50/30" : ""}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {typeIcon(alert.type)}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={severityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {alert.type.replace(/_/g, " ")}
                        </span>
                        {alert.kiosk && (
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {alert.kiosk.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                  {!alert.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markRead.mutate({ alertId: alert.id })}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {alerts.data?.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No alerts found
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
