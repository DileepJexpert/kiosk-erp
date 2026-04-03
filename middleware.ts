import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect operators away from owner pages
  const ownerPages = ["/dashboard", "/dispatch", "/reconcile", "/inventory", "/billing", "/salary", "/templates", "/settings", "/reports"];
  if (role === "OPERATOR" && ownerPages.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/my-kiosk", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
