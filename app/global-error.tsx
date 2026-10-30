"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-8 rounded-xl shadow border border-slate-200">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto text-2xl font-bold">
            !
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-slate-900">Application Error</h1>
            <p className="text-sm text-slate-500">
              A critical error occurred. Please refresh or try again.
            </p>
          </div>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-orange-600 text-white rounded-md font-medium text-sm hover:bg-orange-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
