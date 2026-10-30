import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Store, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="flex justify-center">
          <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
            <Store className="h-8 w-8" />
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">404</h1>
          <h2 className="text-xl font-semibold text-slate-800">Page Not Found</h2>
          <p className="text-sm text-slate-500">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="javascript:history.back()">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-orange-600 hover:bg-orange-700">
            <Link href="/">
              <Home className="h-4 w-4" />
              Return Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
