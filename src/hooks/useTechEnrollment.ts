import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TechEnrollmentResponse,
  CreateEnrollmentInput,
  UpdateEnrollmentInput,
  UploadPhotoInput,
} from "@/types/time-clock";

// Fetch all enrollments
async function fetchEnrollments(search?: string): Promise<TechEnrollmentResponse[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);

  const response = await fetch(`/api/tech-enrollment?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch enrollments");
  }
  return response.json();
}

// Fetch single enrollment
async function fetchEnrollment(id: string): Promise<TechEnrollmentResponse | null> {
  const response = await fetch(`/api/tech-enrollment/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error("Failed to fetch enrollment");
  }
  return response.json();
}

// Create enrollment
async function createEnrollment(data: CreateEnrollmentInput): Promise<TechEnrollmentResponse> {
  const response = await fetch("/api/tech-enrollment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create enrollment");
  }

  return response.json();
}

// Update enrollment
async function updateEnrollment({
  id,
  data,
}: {
  id: string;
  data: UpdateEnrollmentInput;
}): Promise<TechEnrollmentResponse> {
  const response = await fetch(`/api/tech-enrollment/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update enrollment");
  }

  return response.json();
}

// Delete enrollment
async function deleteEnrollment(id: string): Promise<void> {
  const response = await fetch(`/api/tech-enrollment/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete enrollment");
  }
}

// Upload photo
async function uploadPhoto({
  id,
  data,
}: {
  id: string;
  data: UploadPhotoInput;
}): Promise<TechEnrollmentResponse> {
  const response = await fetch(`/api/tech-enrollment/${id}/photo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to upload photo");
  }

  return response.json();
}

// Delete photo
async function deletePhoto(id: string): Promise<void> {
  const response = await fetch(`/api/tech-enrollment/${id}/photo`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete photo");
  }
}

// Hook to fetch all enrollments
export function useTechEnrollments(search?: string) {
  return useQuery({
    queryKey: ["tech-enrollments", search],
    queryFn: () => fetchEnrollments(search),
  });
}

// Hook to fetch single enrollment
export function useTechEnrollment(id: string) {
  return useQuery({
    queryKey: ["tech-enrollment", id],
    queryFn: () => fetchEnrollment(id),
    enabled: !!id,
  });
}

// Hook to create enrollment
export function useCreateTechEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-enrollments"] });
    },
  });
}

// Hook to update enrollment
export function useUpdateTechEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateEnrollment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tech-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["tech-enrollment", data.id] });
    },
  });
}

// Hook to delete enrollment
export function useDeleteTechEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-enrollments"] });
    },
  });
}

// Hook to upload photo
export function useUploadTechPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadPhoto,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tech-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["tech-enrollment", data.id] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

// Hook to delete photo
export function useDeleteTechPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deletePhoto,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tech-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}
