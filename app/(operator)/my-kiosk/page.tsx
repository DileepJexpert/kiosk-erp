"use client";

import { trpc } from "@/lib/trpc-client";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Check } from "lucide-react";
import { toast } from "sonner";

export default function MyKioskPage() {
  const utils = trpc.useUtils();
  const dispatches = trpc.dispatch.getUnreconciled.useQuery();

  const confirm = trpc.dispatch.confirm.useMutation({
    onSuccess: () => {
      utils.dispatch.getUnreconciled.invalidate();
      toast.success("Dispatch confirmed!");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My Kiosk</h1>
      <p className="text-sm text-muted-foreground">Today&apos;s dispatch and items</p>

      {dispatches.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : dispatches.data?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No dispatches pending</p>
            <p className="text-sm text-muted-foreground">All dispatches have been reconciled</p>
          </CardContent>
        </Card>
      ) : (
        dispatches.data?.map((dispatch) => (
          <Card key={dispatch.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {dispatch.kiosk.name}
                </CardTitle>
                <Badge
                  className={
                    dispatch.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }
                >
                  {dispatch.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(dispatch.date)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Items list */}
              <div className="space-y-2">
                {dispatch.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{item.item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.item.unit}</p>
                    </div>
                    <span className="text-lg font-bold">{item.quantity}</span>
                  </div>
                ))}
              </div>

              {dispatch.status === "PENDING" && (
                <Button
                  className="w-full h-12 text-base bg-green-600 hover:bg-green-700"
                  onClick={() => confirm.mutate({ id: dispatch.id })}
                  disabled={confirm.isPending}
                >
                  <Check className="h-5 w-5 mr-2" />
                  {confirm.isPending ? "Confirming..." : "Confirm Receipt"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
