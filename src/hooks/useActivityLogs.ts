import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActivityLogInput,
  ActivityLogResponse,
  ListActivityLogsInput,
  ActivityLogReport,
} from "@/types/activity-log";

// Fetch activity logs with filters
async function fetchActivityLogs(
  params: ListActivityLogsInput = {}
): Promise<ActivityLogResponse[]> {
  const searchParams = new URLSearchParams();

  if (params.agentId) searchParams.set("agentId", params.agentId);
  if (params.departmentId) searchParams.set("departmentId", params.departmentId);
  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.category) searchParams.set("category", params.category);

  const response = await fetch(`/api/activity-logs?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch activity logs");
  }
  return response.json();
}

// Fetch single activity log
async function fetchActivityLog(id: string): Promise<ActivityLogResponse> {
  const response = await fetch(`/api/activity-logs/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch activity log");
  }
  return response.json();
}

// Create activity log
async function createActivityLog(
  data: ActivityLogInput
): Promise<ActivityLogResponse> {
  const response = await fetch("/api/activity-logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create activity log");
  }

  return response.json();
}

// Update activity log
async function updateActivityLog({
  id,
  data,
}: {
  id: string;
  data: Partial<ActivityLogInput>;
}): Promise<ActivityLogResponse> {
  const response = await fetch(`/api/activity-logs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update activity log");
  }

  return response.json();
}

// Delete activity log
async function deleteActivityLog(id: string): Promise<void> {
  const response = await fetch(`/api/activity-logs/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete activity log");
  }
}

// Fetch activity log report
async function fetchActivityLogReport(params: {
  startDate: string;
  endDate: string;
  departmentId?: string;
  agentId?: string;
}): Promise<ActivityLogReport> {
  const searchParams = new URLSearchParams();
  searchParams.set("startDate", params.startDate);
  searchParams.set("endDate", params.endDate);
  if (params.departmentId) searchParams.set("departmentId", params.departmentId);
  if (params.agentId) searchParams.set("agentId", params.agentId);

  const response = await fetch(`/api/activity-logs/reports?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch report");
  }
  return response.json();
}

// ============================================
// HOOKS
// ============================================

// Hook to fetch activity logs
export function useActivityLogs(params: ListActivityLogsInput = {}) {
  return useQuery({
    queryKey: ["activity-logs", params],
    queryFn: () => fetchActivityLogs(params),
  });
}

// Hook to fetch single activity log
export function useActivityLog(id: string) {
  return useQuery({
    queryKey: ["activity-log", id],
    queryFn: () => fetchActivityLog(id),
    enabled: !!id,
  });
}

// Hook to create activity log
export function useCreateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivityLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

// Hook to update activity log
export function useUpdateActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateActivityLog,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      queryClient.invalidateQueries({ queryKey: ["activity-log", data.id] });
    },
  });
}

// Hook to delete activity log
export function useDeleteActivityLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteActivityLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
}

// Hook to fetch activity log report
export function useActivityLogReport(params: {
  startDate: string;
  endDate: string;
  departmentId?: string;
  agentId?: string;
}) {
  return useQuery({
    queryKey: ["activity-log-report", params],
    queryFn: () => fetchActivityLogReport(params),
    enabled: !!params.startDate && !!params.endDate,
  });
}
