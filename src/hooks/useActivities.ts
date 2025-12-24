import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockActivityTypes, MockActivityType } from "@/lib/mock-data";
import { ActivityTypeInput } from "@/types/activity";

// In-memory store for mock data
let activities = [...mockActivityTypes];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch all activity types (mock)
async function fetchActivities(category?: string): Promise<MockActivityType[]> {
  await delay(300); // Simulate network delay

  let result = activities.filter(a => a.isActive);
  if (category) {
    result = result.filter(a => a.category === category);
  }
  return result.sort((a, b) => a.displayOrder - b.displayOrder);
}

// Create a new activity type (mock)
async function createActivity(data: ActivityTypeInput): Promise<MockActivityType> {
  await delay(300);

  const existing = activities.find(a => a.name === data.name);
  if (existing) {
    throw new Error("An activity type with this name already exists");
  }

  const newActivity: MockActivityType = {
    id: `act-${Date.now()}`,
    ...data,
    description: data.description || null,
    isActive: true,
    isSystemType: false,
    displayOrder: activities.length + 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  activities.push(newActivity);
  return newActivity;
}

// Update an activity type (mock)
async function updateActivity({
  id,
  data,
}: {
  id: string;
  data: Partial<ActivityTypeInput>;
}): Promise<MockActivityType> {
  await delay(300);

  const index = activities.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error("Activity type not found");
  }

  if (data.name && data.name !== activities[index].name) {
    const nameConflict = activities.find(a => a.name === data.name && a.id !== id);
    if (nameConflict) {
      throw new Error("An activity type with this name already exists");
    }
  }

  activities[index] = {
    ...activities[index],
    ...data,
    updatedAt: new Date(),
  };

  return activities[index];
}

// Delete an activity type (mock)
async function deleteActivity(id: string): Promise<void> {
  await delay(300);

  const index = activities.findIndex(a => a.id === id);
  if (index === -1) {
    throw new Error("Activity type not found");
  }

  if (activities[index].isSystemType) {
    throw new Error("Cannot delete system activity types");
  }

  // Soft delete
  activities[index].isActive = false;
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
  activities: MockActivityType[]
): Record<string, MockActivityType[]> {
  const grouped: Record<string, MockActivityType[]> = {
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
