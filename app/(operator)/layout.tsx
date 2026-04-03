"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { Store, ShoppingCart, ClipboardCheck, Wallet, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const tabs = [
  { label: "My Kiosk", href: "/my-kiosk", icon: Store },
  { label: "Sell", href: "/sell", icon: ShoppingCart },
  { label: "Reconcile", href: "/my-reconcile", icon: ClipboardCheck },
  { label: "Salary", href: "/my-salary", icon: Wallet },
];

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Top header */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-orange-500" />
          <span className="font-bold text-base">Kiosk ERP</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{session.user?.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto p-4">{children}</main>

      {/* Bottom tab navigation */}
      <nav className="border-t bg-white shrink-0 safe-area-bottom">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "text-orange-600"
                    : "text-gray-500 active:text-gray-700"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-orange-600")} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
