import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type InOfficeDay = {
  agentId: string;
  date: string; // YYYY-MM-DD
};

// Fetch in-office days for a date range from API
async function fetchInOfficeDays(startDate: string, endDate: string): Promise<InOfficeDay[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`/api/in-office-days?${params}`);

  if (!response.ok) {
    throw new Error("Failed to fetch in-office days");
  }

  return response.json();
}

// Toggle in-office status via API
async function toggleInOfficeDay({ agentId, date }: { agentId: string; date: string }): Promise<{ inOffice: boolean; agentId: string; date: string }> {
  const response = await fetch("/api/in-office-days", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, date }),
  });

  if (!response.ok) {
    throw new Error("Failed to toggle in-office status");
  }

  return response.json();
}

// Hook to fetch in-office days for a date range
export function useInOfficeDays(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["inOfficeDays", startDate, endDate],
    queryFn: () => fetchInOfficeDays(startDate, endDate),
  });
}

// Hook to toggle in-office status
export function useToggleInOfficeDay() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: toggleInOfficeDay,
    onSuccess: () => {
      // Invalidate all in-office days queries
      queryClient.invalidateQueries({ queryKey: ["inOfficeDays"] });
    },
  });
}

// Helper to check if an agent is in-office on a specific date
export function isInOffice(inOfficeDays: InOfficeDay[] | undefined, agentId: string, date: string): boolean {
  if (!inOfficeDays) return false;
  return inOfficeDays.some(day => day.agentId === agentId && day.date === date);
}
