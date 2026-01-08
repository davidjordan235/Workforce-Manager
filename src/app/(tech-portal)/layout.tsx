"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { Clock } from "lucide-react";

export default function TechPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-900 text-white">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Tech Time Clock
                </h1>
                <p className="text-xs text-gray-500">Clock In / Clock Out</p>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Toaster position="top-center" richColors />
      </div>
    </QueryClientProvider>
  );
}
