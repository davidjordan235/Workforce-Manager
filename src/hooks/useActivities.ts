import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ActivityTypeInput } from "@/types/activity";

// Activity type from database
export type ActivityType = {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  category: "WORK" | "BREAK" | "TRAINING" | "MEETING" | "PROJECT" | "TIME_OFF" | "CUSTOM";
  color: string;
  textColor: string;
  isPaid: boolean;
  countsAsWorking: boolean;
  isActive: boolean;
  isSystemType: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

// Fetch all activity types from API
async function fetchActivities(category?: string): Promise<ActivityType[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);

  const response = await fetch(`/api/activities?${params}`);
  if (!response.ok) throw new Error("Failed to fetch activities");
  return response.json();
}

// Create a new activity type via API
async function createActivity(data: ActivityTypeInput): Promise<ActivityType> {
  const response = await fetch("/api/activities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create activity");
  }

  return response.json();
}

// Update an activity type via API
async function updateActivity({
  id,
  data,
}: {
  id: string;
  data: Partial<ActivityTypeInput>;
}): Promise<ActivityType> {
  const response = await fetch(`/api/activities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update activity");
  }

  return response.json();
}

// Delete an activity type via API
async function deleteActivity(id: string): Promise<void> {
  const response = await fetch(`/api/activities/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete activity");
  }
}

// Hook to fetch activity types
export function useActivities(category?: string) {
  return useQuery({
    queryKey: ["activities", category],
    queryFn: () => fetchActivities(category),
  });
}

// Hook to create activity type
export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// Hook to update activity type
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// Hook to delete activity type
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteActivity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// Group activities by category
export function groupActivitiesByCategory(
  activities: ActivityType[]
): Record<string, ActivityType[]> {
  const grouped: Record<string, ActivityType[]> = {
    WORK: [],
    BREAK: [],
    TRAINING: [],
    MEETING: [],
    PROJECT: [],
    TIME_OFF: [],
    CUSTOM: [],
  };

  activities.forEach((activity) => {
    if (grouped[activity.category]) {
      grouped[activity.category].push(activity);
    }
  });

  return grouped;
}
