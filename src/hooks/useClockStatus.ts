"use client";

import { useQuery } from "@tanstack/react-query";

export interface ClockStatusEntry {
  isClockedIn: boolean;
  lastPunchTime: string | null;
  lastPunchType: string | null;
  firstName: string;
  lastName: string;
  color: string | null;
  departmentId: string | null;
  departmentName: string | null;
}

export type ClockStatusMap = Record<string, ClockStatusEntry>;

async function fetchClockStatus(): Promise<ClockStatusMap> {
  const response = await fetch("/api/clock-status");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch clock status");
  }
  return response.json();
}

export function useClockStatus() {
  return useQuery({
    queryKey: ["clock-status"],
    queryFn: fetchClockStatus,
    refetchInterval: 30000, // Refresh every 30 seconds to keep status current
    staleTime: 15000, // Consider data stale after 15 seconds
  });
}
