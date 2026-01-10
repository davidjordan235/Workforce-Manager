import { z } from "zod";

// Common activity categories
export const ACTIVITY_CATEGORIES = [
  "Meeting",
  "Development",
  "Code Review",
  "Testing",
  "Documentation",
  "Planning",
  "Training",
  "Admin",
  "Support",
  "Break",
  "Other",
] as const;

// Zod schema for creating/updating activity logs
export const activityLogSchema = z.object({
  agentId: z.string().cuid(),
  date: z.string(), // ISO date string (YYYY-MM-DD)
  startTime: z.string(), // HH:MM format
  endTime: z.string(), // HH:MM format
  description: z.string().min(1, "Description is required").max(500),
  category: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export type ActivityLogInput = z.infer<typeof activityLogSchema>;

// Response type from API
export interface ActivityLogResponse {
  id: string;
  agentId: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  agent?: {
    id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: {
      id: string;
      name: string;
    } | null;
  };
}

// Query params for listing activity logs
export const listActivityLogsSchema = z.object({
  agentId: z.string().cuid().optional(),
  departmentId: z.string().cuid().optional(),
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(), // ISO date string
  category: z.string().optional(),
});

export type ListActivityLogsInput = z.input<typeof listActivityLogsSchema>;

// Report data types
export interface ActivityLogSummary {
  agentId: string;
  agentName: string;
  department: string | null;
  totalMinutes: number;
  entries: number;
  byCategory: Record<string, number>; // category -> minutes
}

export interface ActivityLogReport {
  startDate: string;
  endDate: string;
  summaries: ActivityLogSummary[];
  totalMinutes: number;
  totalEntries: number;
}
