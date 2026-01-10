"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardExceptions } from "@/types/dashboard";

async function fetchExceptions(date: string): Promise<DashboardExceptions> {
  const response = await fetch(`/api/dashboard/exceptions?date=${date}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch dashboard exceptions");
  }
  return response.json();
}

export function useDashboardExceptions(date: string) {
  return useQuery({
    queryKey: ["dashboard-exceptions", date],
    queryFn: () => fetchExceptions(date),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}
