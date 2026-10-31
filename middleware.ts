import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Comprehensive list of owner/manager-only application routes
const OWNER_ROUTES = [
  "/alerts",
  "/attendance",
  "/billing",
  "/cash-collection",
  "/compliance",
  "/customers",
  "/dashboard",
  "/dispatch",
  "/equipment",
  "/expenses",
  "/franchise",
  "/gst-reports",
  "/inventory",
  "/performance",
  "/purchases",
  "/recipes",
  "/reconcile",
  "/reports",
  "/salary",
  "/settings",
  "/suppliers",
  "/templates",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  // Allow internal API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public customer self-ordering QR portal and TV token display
  if (pathname.startsWith("/order") || pathname.startsWith("/display")) {
    return NextResponse.next();
  }

  // Handle /login access
  if (pathname === "/login") {
    if (isLoggedIn) {
      const destination = role === "OPERATOR" ? "/my-kiosk" : "/dashboard";
      return NextResponse.redirect(new URL(destination, req.url));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control: Prevent operators from accessing owner/manager screens
  if (
    role === "OPERATOR" &&
    OWNER_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"))
  ) {
    return NextResponse.redirect(new URL("/my-kiosk", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.json).*)"],
};
