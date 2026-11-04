"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Store, UtensilsCrossed, ArrowRight } from "lucide-react";

export default function KDSIndexPage() {
  const router = useRouter();
  const kiosksQuery = trpc.kiosk.list.useQuery();

  useEffect(() => {
    if (kiosksQuery.data && kiosksQuery.data.length === 1) {
      router.replace(`/kds/${kiosksQuery.data[0].id}`);
    }
  }, [kiosksQuery.data, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="h-16 w-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/30">
          <UtensilsCrossed className="h-8 w-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Select Kitchen KDS Counter</h1>
          <p className="text-xs text-slate-400 mt-1">
            Choose which kitchen terminal to load for real-time ticket display and prep timing.
          </p>
        </div>

        <div className="space-y-2.5 text-left">
          {kiosksQuery.isLoading ? (
            <p className="text-xs text-slate-500 text-center py-8">Loading active kiosks...</p>
          ) : (
            kiosksQuery.data?.map((kiosk) => (
              <Card
                key={kiosk.id}
                className="p-4 bg-slate-900 border-slate-800 hover:border-amber-500/50 cursor-pointer flex justify-between items-center transition-all"
                onClick={() => router.push(`/kds/${kiosk.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-300">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{kiosk.name}</h3>
                    <p className="text-xs text-slate-400">{kiosk.location}</p>
                  </div>
                </div>

                <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-slate-800">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
