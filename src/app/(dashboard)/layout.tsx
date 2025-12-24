"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, createContext, useContext } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { mockUser } from "@/lib/mock-data";

// Mock session context
type MockSession = {
  user: typeof mockUser;
};

const SessionContext = createContext<{ data: MockSession | null }>({
  data: { user: mockUser },
});

export function useSession() {
  return useContext(SessionContext);
}

export default function DashboardLayout({
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
          },
        },
      })
  );

  return (
    <SessionContext.Provider value={{ data: { user: mockUser } }}>
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {children}
          </main>
        </div>
        <Toaster />
      </QueryClientProvider>
    </SessionContext.Provider>
  );
}
