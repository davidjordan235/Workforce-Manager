import { z } from "zod";
import { ActivityCategory } from "@prisma/client";

// Zod schema for creating/updating activity types
export const activityTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  shortName: z.string().min(1, "Short name is required").max(4),
  description: z.string().max(255).optional().nullable(),
  category: z.nativeEnum(ActivityCategory),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  isPaid: z.boolean(),
  countsAsWorking: z.boolean(),
  displayOrder: z.number().int().min(0).optional(),
});

export type ActivityTypeInput = z.infer<typeof activityTypeSchema>;

// Category labels for display
export const categoryLabels: Record<ActivityCategory, string> = {
  WORK: "Work",
  BREAK: "Break",
  TRAINING: "Training",
  MEETING: "Meeting",
  PROJECT: "Project",
  TIME_OFF: "Time Off",
  CUSTOM: "Custom",
};

// Category colors for grouping display
export const categoryColors: Record<ActivityCategory, string> = {
  WORK: "#4CAF50",
  BREAK: "#FF9800",
  TRAINING: "#2196F3",
  MEETING: "#9C27B0",
  PROJECT: "#607D8B",
  TIME_OFF: "#03A9F4",
  CUSTOM: "#795548",
};
