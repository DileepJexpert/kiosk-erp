"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle2,
  Volume2,
  VolumeX,
  Store,
  Sparkles,
  ChefHat,
  UtensilsCrossed,
} from "lucide-react";

export default function TokenDisplayTVPage() {
  const params = useParams();
  const kioskId = params?.kioskId as string;

  const [soundEnabled, setSoundEnabled] = useState(true);
  const announcedTokens = useRef<Set<string>>(new Set());

  const kiosk = trpc.kiosk.getPublicMenu.useQuery({ kioskId }, { enabled: !!kioskId });
  const tokens = trpc.billing.getLiveTokens.useQuery(
    { kioskId },
    {
      enabled: !!kioskId,
      refetchInterval: 3000, // Live poll every 3 seconds for TV
    }
  );

  // Play audio chime and speak ready token
  const announceReadyToken = (tokenNumber: string) => {
    if (!soundEnabled) return;
    try {
      // 1. Web Audio API ding-dong chime
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.setValueAtTime(880.0, now + 0.15); // A5
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc1.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.8);
      }

      // 2. Web Speech Voice Alert
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Token number ${tokenNumber.replace(/^0+/, "")} is ready for pickup!`
        );
        utterance.rate = 1.0;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      }
    } catch {
      // Browser autoplay policy catch
    }
  };

  // Monitor for newly ready tokens
  useEffect(() => {
    if (tokens.data?.ready) {
      tokens.data.ready.forEach((item: any) => {
        if (!announcedTokens.current.has(item.id)) {
          announcedTokens.current.add(item.id);
          announceReadyToken(item.tokenNumber);
        }
      });
    }
  }, [tokens.data?.ready, soundEnabled]);

  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden">
      {/* Top TV Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <Store className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              {kiosk.data?.name || "Kiosk Order Status"}
              <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs">
                Live TV Display
              </Badge>
            </h1>
            <p className="text-xs text-slate-400">{kiosk.data?.location || "Counter Pickup Board"}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-white text-xs gap-1.5"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400" /> Sound ON
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-red-400" /> Sound Muted
              </>
            )}
          </Button>

          <div className="bg-slate-800/80 px-4 py-1.5 rounded-lg border border-slate-700/60 font-mono text-xl font-bold tracking-wider text-orange-400">
            {currentTime}
          </div>
        </div>
      </header>

      {/* Main Split Order Board */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Column 1: Preparing (Yellow / Amber) */}
        <section className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400 border border-amber-500/20">
                <ChefHat className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-amber-400 tracking-wide">
                  PREPARING / तैयार हो रहा है
                </h2>
                <p className="text-xs text-slate-400">Orders currently being cooked</p>
              </div>
            </div>
            <Badge className="bg-amber-500/20 text-amber-300 text-sm font-bold px-3 py-1 border border-amber-500/40">
              {tokens.data?.preparing?.length || 0} In Kitchen
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {tokens.data?.preparing?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 space-y-2">
                <Clock className="h-12 w-12 text-slate-700 animate-pulse" />
                <p className="text-sm font-medium">No pending kitchen orders</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tokens.data?.preparing?.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-4 text-center shadow-md animate-pulse"
                  >
                    <span className="text-xs uppercase font-semibold text-amber-400/80 tracking-widest block">
                      TOKEN
                    </span>
                    <span className="text-4xl font-black tracking-tight text-white block mt-0.5">
                      #{item.tokenNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {item.itemCount} items
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Column 2: Ready for Pickup (Emerald Green) */}
        <section className="bg-slate-900/70 border border-emerald-500/40 rounded-2xl p-5 flex flex-col shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-emerald-400 tracking-wide">
                  READY FOR PICKUP / काउंटर से लें
                </h2>
                <p className="text-xs text-slate-400">Please collect your fresh order</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-300 text-sm font-bold px-3 py-1 border border-emerald-500/40">
              {tokens.data?.ready?.length || 0} Ready
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 pr-1">
            {tokens.data?.ready?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 py-16 space-y-2">
                <UtensilsCrossed className="h-12 w-12 text-slate-700" />
                <p className="text-sm font-medium">Orders will appear here when ready</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tokens.data?.ready?.map((item: any) => (
                  <div
                    key={item.id}
                    className="bg-emerald-950/40 border-2 border-emerald-500 rounded-xl p-4 text-center shadow-lg relative overflow-hidden"
                  >
                    <div className="absolute top-1 right-1">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="text-xs uppercase font-bold text-emerald-400 tracking-widest block">
                      PICK UP NOW
                    </span>
                    <span className="text-5xl font-black tracking-tight text-emerald-300 block my-1">
                      #{item.tokenNumber}
                    </span>
                    <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px] px-2 py-0">
                      COUNTER READY
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Footer Info Ticker */}
      <footer className="bg-slate-900/90 border-t border-slate-800 px-6 py-2.5 flex justify-between items-center text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span>Real-time kitchen order queue</span>
        </div>
        <div>
          Scan QR at counter for self-ordering • <span className="text-orange-400 font-semibold">Kiosk ERP</span>
        </div>
      </footer>
    </div>
  );
}
