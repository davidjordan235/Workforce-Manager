import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockScheduleEntries, MockScheduleEntry, mockActivityTypes, mockAgents } from "@/lib/mock-data";
import { ScheduleEntryInput } from "@/types/schedule";

// In-memory store for mock data
let scheduleEntries = [...mockScheduleEntries];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch schedule entries for a date
async function fetchScheduleByDate(date: string): Promise<MockScheduleEntry[]> {
  await delay(200);
  return scheduleEntries.filter(entry => entry.date === date);
}

// Fetch schedule entries for an agent
async function fetchScheduleByAgent(agentId: string, startDate: string, endDate: string): Promise<MockScheduleEntry[]> {
  await delay(200);
  return scheduleEntries.filter(
    entry => entry.agentId === agentId && entry.date >= startDate && entry.date <= endDate
  );
}

// Fetch schedule entries for a date range
async function fetchScheduleByDateRange(startDate: string, endDate: string): Promise<MockScheduleEntry[]> {
  await delay(200);
  return scheduleEntries.filter(
    entry => entry.date >= startDate && entry.date <= endDate
  );
}

// Create a new schedule entry
async function createScheduleEntry(data: ScheduleEntryInput): Promise<MockScheduleEntry> {
  await delay(200);

  const newEntry: MockScheduleEntry = {
    id: `sched-${Date.now()}`,
    agentId: data.agentId,
    activityTypeId: data.activityTypeId,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    notes: data.notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  scheduleEntries.push(newEntry);
  return newEntry;
}

// Update a schedule entry
async function updateScheduleEntry({
  id,
  data,
}: {
  id: string;
  data: Partial<ScheduleEntryInput>;
}): Promise<MockScheduleEntry> {
  await delay(200);

  const index = scheduleEntries.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error("Schedule entry not found");
  }

  scheduleEntries[index] = {
    ...scheduleEntries[index],
    ...data,
    updatedAt: new Date(),
  };

  return scheduleEntries[index];
}

// Delete a schedule entry
async function deleteScheduleEntry(id: string): Promise<void> {
  await delay(200);

  const index = scheduleEntries.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error("Schedule entry not found");
  }

  scheduleEntries.splice(index, 1);
}

// Move a schedule entry (drag-drop)
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
}): Promise<MockScheduleEntry> {
  await delay(100); // Fast for drag-drop

  const index = scheduleEntries.findIndex(e => e.id === id);
  if (index === -1) {
    throw new Error("Schedule entry not found");
  }

  scheduleEntries[index] = {
    ...scheduleEntries[index],
    agentId,
    startTime,
    endTime,
    date: date || scheduleEntries[index].date,
    updatedAt: new Date(),
  };

  return scheduleEntries[index];
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

// Hook to create schedule entry
export function useCreateScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createScheduleEntry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedule", "date", data.date] });
    },
  });
}

// Hook to update schedule entry
export function useUpdateScheduleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateScheduleEntry,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schedule", "date", data.date] });
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

// Get activity type by ID (helper)
export function getActivityType(activityTypeId: string) {
  return mockActivityTypes.find(a => a.id === activityTypeId);
}

// Get agent by ID (helper)
export function getAgent(agentId: string) {
  return mockAgents.find(a => a.id === agentId);
}
