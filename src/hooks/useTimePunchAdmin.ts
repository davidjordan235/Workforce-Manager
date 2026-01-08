"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AdminTimePunchResponse,
  ListPunchesInput,
  UpdatePunchInput,
  ManualPunchInput,
} from "@/types/time-clock";

interface PunchListResponse {
  punches: AdminTimePunchResponse[];
  total: number;
  limit: number;
  offset: number;
}

// Fetch punches with filters
async function fetchPunches(params: ListPunchesInput): Promise<PunchListResponse> {
  const searchParams = new URLSearchParams();

  if (params.startDate) searchParams.set("startDate", params.startDate);
  if (params.endDate) searchParams.set("endDate", params.endDate);
  if (params.enrollmentId) searchParams.set("enrollmentId", params.enrollmentId);
  if (params.employeeId) searchParams.set("employeeId", params.employeeId);
  if (params.punchType) searchParams.set("punchType", params.punchType);
  if (params.verificationMethod) searchParams.set("verificationMethod", params.verificationMethod);
  if (params.limit) searchParams.set("limit", params.limit.toString());
  if (params.offset) searchParams.set("offset", params.offset.toString());

  const response = await fetch(`/api/time-punch?${searchParams}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch punches");
  }
  return response.json();
}

// Fetch single punch
async function fetchPunch(id: string): Promise<AdminTimePunchResponse> {
  const response = await fetch(`/api/time-punch/${id}`);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch punch");
  }
  return response.json();
}

// Update punch time
async function updatePunch(id: string, data: UpdatePunchInput): Promise<AdminTimePunchResponse> {
  const response = await fetch(`/api/time-punch/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update punch");
  }
  return response.json();
}

// Delete punch
async function deletePunch(id: string): Promise<void> {
  const response = await fetch(`/api/time-punch/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete punch");
  }
}

// Create manual punch
async function createManualPunch(data: ManualPunchInput): Promise<AdminTimePunchResponse> {
  const response = await fetch("/api/time-punch/manual", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create manual punch");
  }
  return response.json();
}

// ============================================
// HOOKS
// ============================================

// List punches with filters
export function useAdminPunches(params: ListPunchesInput = {}) {
  return useQuery({
    queryKey: ["admin-punches", params],
    queryFn: () => fetchPunches(params),
  });
}

// Get single punch
export function useAdminPunch(id: string) {
  return useQuery({
    queryKey: ["admin-punch", id],
    queryFn: () => fetchPunch(id),
    enabled: !!id,
  });
}

// Update punch mutation
export function useUpdatePunch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePunchInput }) => updatePunch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-punches"] });
      queryClient.invalidateQueries({ queryKey: ["admin-punch"] });
    },
  });
}

// Delete punch mutation
export function useDeletePunch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePunch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-punches"] });
    },
  });
}

// Create manual punch mutation
export function useCreateManualPunch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createManualPunch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-punches"] });
    },
  });
}
