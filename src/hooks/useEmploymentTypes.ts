import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EmploymentTypeInput, EmploymentTypeResponse } from "@/types/employee";

// Fetch all employment types from API
async function fetchEmploymentTypes(activeOnly = true): Promise<EmploymentTypeResponse[]> {
  const params = new URLSearchParams();
  if (!activeOnly) params.set("active", "false");

  const response = await fetch(`/api/employment-types?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch employment types");
  }
  return response.json();
}

// Fetch single employment type from API
async function fetchEmploymentType(id: string): Promise<EmploymentTypeResponse | null> {
  const response = await fetch(`/api/employment-types/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Failed to fetch employment type");
  }
  return response.json();
}

// Create a new employment type via API
async function createEmploymentType(data: EmploymentTypeInput): Promise<EmploymentTypeResponse> {
  const response = await fetch("/api/employment-types", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create employment type");
  }

  return response.json();
}

// Update an employment type via API
async function updateEmploymentType({
  id,
  data,
}: {
  id: string;
  data: Partial<EmploymentTypeInput>;
}): Promise<EmploymentTypeResponse> {
  const response = await fetch(`/api/employment-types/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update employment type");
  }

  return response.json();
}

// Delete an employment type via API
async function deleteEmploymentType(id: string): Promise<void> {
  const response = await fetch(`/api/employment-types/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete employment type");
  }
}

// Hook to fetch employment types
export function useEmploymentTypes(activeOnly = true) {
  return useQuery({
    queryKey: ["employmentTypes", activeOnly],
    queryFn: () => fetchEmploymentTypes(activeOnly),
  });
}

// Hook to fetch single employment type
export function useEmploymentType(id: string) {
  return useQuery({
    queryKey: ["employmentType", id],
    queryFn: () => fetchEmploymentType(id),
    enabled: !!id,
  });
}

// Hook to create employment type
export function useCreateEmploymentType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEmploymentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employmentTypes"] });
    },
  });
}

// Hook to update employment type
export function useUpdateEmploymentType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEmploymentType,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employmentTypes"] });
      queryClient.invalidateQueries({ queryKey: ["employmentType", data.id] });
    },
  });
}

// Hook to delete employment type
export function useDeleteEmploymentType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEmploymentType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employmentTypes"] });
    },
  });
}
