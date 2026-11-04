"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  Bell,
  BellOff,
  Flame,
  Volume2,
  Coffee,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export default function KitchenDisplayPage() {
  const params = useParams();
  const kioskId = params?.kioskId as string;

  const [currentTime, setCurrentTime] = useState<string>("");
  const [stationFilter, setStationFilter] = useState<"ALL" | "BEVERAGE" | "FOOD">("ALL");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousOrderCount = useRef<number>(0);

  // Live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live KDS orders with 3-second auto-poll
  const kdsQuery = trpc.billing.getKDSOrders.useQuery(
    { kioskId },
    {
      enabled: !!kioskId,
      refetchInterval: 3000,
    }
  );

  const startCooking = trpc.billing.startCooking.useMutation({
    onSuccess: () => {
      kdsQuery.refetch();
      toast.success("Cooking started!");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.billing.updateOrderStatus.useMutation({
    onSuccess: (_data, variables) => {
      kdsQuery.refetch();
      if (variables.orderStatus === "READY") {
        toast.success("Order marked READY! Token announced on TV display.");
      } else {
        toast.success(`Order marked as ${variables.orderStatus}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // Synthesize kitchen chime on incoming new order
  const playKitchenChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(880.0, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Audio chime failed", e);
    }
  };

  useEffect(() => {
    if (kdsQuery.data) {
      if (
        previousOrderCount.current > 0 &&
        kdsQuery.data.length > previousOrderCount.current &&
        soundEnabled
      ) {
        playKitchenChime();
        toast.info("🔔 New Kitchen Order Ticket received!");
      }
      previousOrderCount.current = kdsQuery.data.length;
    }
  }, [kdsQuery.data, soundEnabled]);

  const orders = kdsQuery.data || [];

  const filteredOrders = orders.map((order) => {
    const matchingItems = order.items.filter((it: any) => {
      if (stationFilter === "ALL") return true;
      return it.item?.category === stationFilter;
    });
    return { ...order, visibleItems: matchingItems };
  }).filter((order) => order.visibleItems.length > 0);

  const getElapsedMinutes = (dateStr: Date | string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const formatElapsed = (dateStr: Date | string) => {
    const elapsedSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* KDS Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3.5 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/30">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-lg text-white tracking-wide">KITCHEN DISPLAY SYSTEM</h1>
              <Badge className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5">
                KDS LIVE
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Kitchen Preparation Board • {orders.length} Active Orders
            </p>
          </div>
        </div>

        {/* Station Filters */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <Button
            size="sm"
            variant={stationFilter === "ALL" ? "default" : "ghost"}
            className={`text-xs h-8 px-3 rounded-lg ${
              stationFilter === "ALL" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
            }`}
            onClick={() => setStationFilter("ALL")}
          >
            All Stations
          </Button>
          <Button
            size="sm"
            variant={stationFilter === "BEVERAGE" ? "default" : "ghost"}
            className={`text-xs h-8 px-3 rounded-lg gap-1.5 ${
              stationFilter === "BEVERAGE" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
            }`}
            onClick={() => setStationFilter("BEVERAGE")}
          >
            <Coffee className="h-3.5 w-3.5" />
            Chai Bar
          </Button>
          <Button
            size="sm"
            variant={stationFilter === "FOOD" ? "default" : "ghost"}
            className={`text-xs h-8 px-3 rounded-lg gap-1.5 ${
              stationFilter === "FOOD" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400"
            }`}
            onClick={() => setStationFilter("FOOD")}
          >
            <Flame className="h-3.5 w-3.5" />
            Snacks & Rolls
          </Button>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-slate-300 hover:text-white h-8 gap-1.5 text-xs"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <>
                <Bell className="h-3.5 w-3.5 text-emerald-400" /> Bell On
              </>
            ) : (
              <>
                <BellOff className="h-3.5 w-3.5 text-red-400" /> Bell Muted
              </>
            )}
          </Button>

          <div className="text-right">
            <span className="font-mono text-base font-bold text-amber-400 block tracking-wider">
              {currentTime || "00:00:00"}
            </span>
            <span className="text-[10px] text-slate-500 block uppercase">Auto-sync 3s</span>
          </div>
        </div>
      </header>

      {/* Orders Grid */}
      <main className="flex-1 p-6 overflow-y-auto">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-24 space-y-3">
            <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-slate-600">
              <CheckCircle2 className="h-8 w-8 text-emerald-500/80" />
            </div>
            <h2 className="text-xl font-bold text-slate-300">All Kitchen Orders Cleared!</h2>
            <p className="text-xs text-slate-500 max-w-sm">
              New orders punched at counter or via customer self-ordering QR will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredOrders.map((order) => {
              const elapsedMins = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsedMins >= 8;
              const isWarning = elapsedMins >= 4 && elapsedMins < 8;
              const isReady = order.orderStatus === "READY";

              let borderClass = "border-slate-800";
              let badgeBg = "bg-emerald-950 text-emerald-400 border-emerald-800";
              if (isReady) {
                borderClass = "border-emerald-500 shadow-emerald-900/30 shadow-lg";
                badgeBg = "bg-emerald-500 text-slate-950 font-black";
              } else if (isUrgent) {
                borderClass = "border-red-500 shadow-red-900/40 shadow-lg animate-pulse";
                badgeBg = "bg-red-950 text-red-400 border-red-800";
              } else if (isWarning) {
                borderClass = "border-amber-500/80";
                badgeBg = "bg-amber-950 text-amber-400 border-amber-800";
              }

              return (
                <Card
                  key={order.id}
                  className={`bg-slate-900 flex flex-col justify-between border-2 rounded-2xl overflow-hidden transition-all ${borderClass}`}
                >
                  {/* Card Header */}
                  <div className="bg-slate-950/80 border-b border-slate-800 p-3.5 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-white font-mono tracking-tight">
                          #{String(order.billNumber).padStart(4, "0")}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold px-1.5 py-0 uppercase ${
                            order.orderType === "TAKEAWAY"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : order.orderType === "DELIVERY"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {order.orderType || "DINE_IN"}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {order.orderChannel === "WALK_IN"
                          ? "Counter Order"
                          : order.orderChannel === "OTHER"
                          ? "Self-Order QR"
                          : order.orderChannel}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className={`flex items-center gap-1 font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${badgeBg}`}>
                        <Clock className="h-3 w-3" />
                        <span>{formatElapsed(order.createdAt)}</span>
                      </div>
                      {isUrgent && !isReady && (
                        <span className="text-[10px] font-bold text-red-400 tracking-wide block mt-1">
                          🚨 DELAYED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items Preparation List */}
                  <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                    {order.visibleItems.map((bi: any) => {
                      const modifiers = (bi.modifiers as any[]) || [];
                      return (
                        <div key={bi.id} className="border-b border-slate-800/80 pb-2.5 last:border-0 last:pb-0">
                          <div className="flex items-baseline justify-between">
                            <span className="font-bold text-base text-slate-100 flex items-center gap-2">
                              <span className="text-amber-400 font-mono font-black text-lg">
                                {bi.quantity}x
                              </span>
                              {bi.item?.name}
                            </span>
                          </div>

                          {/* Modifiers Badges */}
                          {modifiers.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 pl-6">
                              {modifiers.map((m, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.2 rounded"
                                >
                                  {m.name.toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}

                          {bi.notes && (
                            <p className="text-[11px] text-slate-400 italic mt-0.5 pl-6">
                              Note: {bi.notes}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {order.notes && (
                      <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-xs text-amber-400/90 italic">
                        📝 Order Note: {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-slate-950/60 p-3 border-t border-slate-800/80 flex gap-2">
                    {order.orderStatus === "PREPARING" ? (
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 gap-1.5 shadow-md"
                        onClick={() =>
                          updateStatus.mutate({
                            billId: order.id,
                            orderStatus: "READY",
                          })
                        }
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Food Ready (Call Token)
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-slate-700 text-slate-300 h-9 text-xs gap-1"
                          onClick={() =>
                            updateStatus.mutate({
                              billId: order.id,
                              orderStatus: "PREPARING",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Back
                        </Button>
                        <Button
                          className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs h-9 gap-1.5"
                          onClick={() =>
                            updateStatus.mutate({
                              billId: order.id,
                              orderStatus: "COMPLETED",
                            })
                          }
                          disabled={updateStatus.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          Mark Picked Up / Served
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
