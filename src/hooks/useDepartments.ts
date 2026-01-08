import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DepartmentInput, DepartmentResponse } from "@/types/employee";

// Fetch all departments from API
async function fetchDepartments(activeOnly = true): Promise<DepartmentResponse[]> {
  const params = new URLSearchParams();
  if (!activeOnly) params.set("active", "false");

  const response = await fetch(`/api/departments?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch departments");
  }
  return response.json();
}

// Fetch single department from API
async function fetchDepartment(id: string): Promise<DepartmentResponse | null> {
  const response = await fetch(`/api/departments/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Failed to fetch department");
  }
  return response.json();
}

// Create a new department via API
async function createDepartment(data: DepartmentInput): Promise<DepartmentResponse> {
  const response = await fetch("/api/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create department");
  }

  return response.json();
}

// Update a department via API
async function updateDepartment({
  id,
  data,
}: {
  id: string;
  data: Partial<DepartmentInput>;
}): Promise<DepartmentResponse> {
  const response = await fetch(`/api/departments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update department");
  }

  return response.json();
}

// Delete a department via API
async function deleteDepartment(id: string): Promise<void> {
  const response = await fetch(`/api/departments/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete department");
  }
}

// Hook to fetch departments
export function useDepartments(activeOnly = true) {
  return useQuery({
    queryKey: ["departments", activeOnly],
    queryFn: () => fetchDepartments(activeOnly),
  });
}

// Hook to fetch single department
export function useDepartment(id: string) {
  return useQuery({
    queryKey: ["department", id],
    queryFn: () => fetchDepartment(id),
    enabled: !!id,
  });
}

// Hook to create department
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

// Hook to update department
export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateDepartment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department", data.id] });
    },
  });
}

// Hook to delete department
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}
