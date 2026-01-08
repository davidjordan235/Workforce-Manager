import { useQuery, useMutation } from "@tanstack/react-query";
import {
  RecordPunchInput,
  TimePunchResponse,
  TechStatusResponse,
  IdentifyTechInput,
  VerifyPinInput,
} from "@/types/time-clock";

// Identify tech by employee ID
export interface IdentifyResponse {
  enrollment: {
    id: string;
    agentId: string;
    agent: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    referencePhotoUrl: string | null;
    hasFaceDescriptor: boolean;
    faceDescriptor: number[] | null;
  };
  lastPunch: {
    id: string;
    punchType: string;
    punchTime: string;
    verificationMethod: string;
  } | null;
  currentStatus: "clocked_in" | "clocked_out";
}

async function identifyTech(data: IdentifyTechInput): Promise<IdentifyResponse> {
  const response = await fetch("/api/tech-portal/identify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to identify employee");
  }

  return response.json();
}

// Verify PIN
async function verifyPin(data: VerifyPinInput): Promise<{ verified: boolean }> {
  const response = await fetch("/api/tech-portal/verify-pin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Invalid PIN");
  }

  return response.json();
}

// Record punch
export interface PunchResponse extends TimePunchResponse {
  agent: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
  message: string;
}

async function recordPunch(data: RecordPunchInput): Promise<PunchResponse> {
  const response = await fetch("/api/tech-portal/punch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to record punch");
  }

  return response.json();
}

// Get status
async function fetchStatus(enrollmentId: string): Promise<TechStatusResponse> {
  const response = await fetch(`/api/tech-portal/status?enrollmentId=${enrollmentId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch status");
  }
  return response.json();
}

// Hook to identify tech
export function useIdentifyTech() {
  return useMutation({
    mutationFn: identifyTech,
  });
}

// Hook to verify PIN
export function useVerifyPin() {
  return useMutation({
    mutationFn: verifyPin,
  });
}

// Hook to record punch
export function useRecordPunch() {
  return useMutation({
    mutationFn: recordPunch,
  });
}

// Hook to get status
export function useTechStatus(enrollmentId: string | null) {
  return useQuery({
    queryKey: ["tech-status", enrollmentId],
    queryFn: () => fetchStatus(enrollmentId!),
    enabled: !!enrollmentId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
