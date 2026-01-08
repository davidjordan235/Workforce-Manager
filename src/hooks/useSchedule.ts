import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { ScheduleEntryInput } from "@/types/schedule";

// Schedule entry type from database
export type ScheduleEntry = {
  id: string;
  agentId: string;
  activityTypeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes: string | null;
};

// Fetch schedule entries for a date from API
async function fetchScheduleByDate(date: string): Promise<ScheduleEntry[]> {
  const params = new URLSearchParams({ startDate: date, endDate: date });
  const response = await fetch(`/api/schedule?${params}`);
  if (!response.ok) throw new Error("Failed to fetch schedule");
  return response.json();
}

// Fetch schedule entries for an agent from API
async function fetchScheduleByAgent(agentId: string, startDate: string, endDate: string): Promise<ScheduleEntry[]> {
  const params = new URLSearchParams({ startDate, endDate, agentId });
  const response = await fetch(`/api/schedule?${params}`);
  if (!response.ok) throw new Error("Failed to fetch schedule");
  return response.json();
}

// Fetch schedule entries for a date range from API
async function fetchScheduleByDateRange(startDate: string, endDate: string): Promise<ScheduleEntry[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const response = await fetch(`/api/schedule?${params}`);
  if (!response.ok) throw new Error("Failed to fetch schedule");
  return response.json();
}

// Create a new schedule entry via API
async function createScheduleEntry(data: ScheduleEntryInput): Promise<ScheduleEntry> {
  const response = await fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create schedule entry");
  }

  return response.json();
}

// Update a schedule entry via API
async function updateScheduleEntry({
  id,
  data,
}: {
  id: string;
  data: Partial<ScheduleEntryInput>;
}): Promise<ScheduleEntry> {
  const response = await fetch(`/api/schedule/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update schedule entry");
  }

  return response.json();
}

// Delete a schedule entry via API
async function deleteScheduleEntry(id: string): Promise<void> {
  const response = await fetch(`/api/schedule/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete schedule entry");
  }
}

// Move a schedule entry (drag-drop) via API
async function moveScheduleEntry({
  id,
  agentId,
  startTime,
  endTime,
  date,
}: {
  id: string;
  agentId: string;
  startTime: string;
  endTime: string;
  date?: string;
}): Promise<ScheduleEntry> {
  const response = await fetch(`/api/schedule/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, startTime, endTime, date }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to move schedule entry");
  }

  return response.json();
}

// Hook to fetch schedule by date
export function useScheduleByDate(date: string) {
  return useQuery({
    queryKey: ["schedule", "date", date],
    queryFn: () => fetchScheduleByDate(date),
  });
}

// Hook to fetch schedule by agent
export function useScheduleByAgent(agentId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["schedule", "agent", agentId, startDate, endDate],
    queryFn: () => fetchScheduleByAgent(agentId, startDate, endDate),
    enabled: !!agentId,
  });
}

// Hook to fetch schedule by date range
export function useScheduleByDateRange(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["schedule", "range", startDate, endDate],
    queryFn: () => fetchScheduleByDateRange(startDate, endDate),
  });
}

// Extended schedule entry with day offset for positioning
export type ExtendedScheduleEntry = ScheduleEntry & {
  _dayOffset: number; // 0 = current day, 1 = next day
};

// Helper to add days to a date string
function addDaysToDate(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Hook to fetch schedule for extended 36-hour view (current day + next day morning)
export function useScheduleExtended(baseDate: string) {
  const nextDate = addDaysToDate(baseDate, 1);

  // Fetch both days
  const currentDayQuery = useQuery({
    queryKey: ["schedule", "date", baseDate],
    queryFn: () => fetchScheduleByDate(baseDate),
  });

  const nextDayQuery = useQuery({
    queryKey: ["schedule", "date", nextDate],
    queryFn: () => fetchScheduleByDate(nextDate),
  });

  const data = useMemo(() => {
    if (!currentDayQuery.data || !nextDayQuery.data) return undefined;

    // Current day entries
    const currentDayEntries: ExtendedScheduleEntry[] = currentDayQuery.data.map(entry => ({
      ...entry,
      _dayOffset: 0,
    }));

    // Next day entries - only include morning (00:00-12:00 start times)
    const nextDayMorningEntries: ExtendedScheduleEntry[] = nextDayQuery.data
      .filter(entry => {
        const hour = parseInt(entry.startTime.split(":")[0]);
        return hour < 12;
      })
      .map(entry => ({
        ...entry,
        _dayOffset: 1,
      }));

    return {
      entries: [...currentDayEntries, ...nextDayMorningEntries],
      baseDate,
      nextDate,
    };
  }, [currentDayQuery.data, nextDayQuery.data, baseDate, nextDate]);

  return {
    data,
    isLoading: currentDayQuery.isLoading || nextDayQuery.isLoading,
    isError: currentDayQuery.isError || nextDayQuery.isError,
  };
}

// Hook to create schedule entry
export function useCreateScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createScheduleEntry,
    onSuccess: () => {
      // Invalidate all schedule queries so both daily and weekly views update
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

// Hook to update schedule entry
export function useUpdateScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateScheduleEntry,
    onSuccess: () => {
      // Invalidate all schedule queries so both daily and weekly views update
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

// Hook to delete schedule entry
export function useDeleteScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteScheduleEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

// Hook to move schedule entry (optimistic update for drag-drop)
export function useMoveScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: moveScheduleEntry,
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["schedule"] });

      // Snapshot previous value
      const previousSchedule = queryClient.getQueryData(["schedule"]);

      return { previousSchedule };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousSchedule) {
        queryClient.setQueryData(["schedule"], context.previousSchedule);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

