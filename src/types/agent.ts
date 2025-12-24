import { z } from "zod";

// Zod schema for creating/updating agents
export const agentSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required").max(20),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(20).optional().nullable(),
  hireDate: z.string().or(z.date()),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional().nullable(),
});

export type AgentInput = z.infer<typeof agentSchema>;

// Agent colors for visual identification
export const agentColors = [
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#FF9800", // Orange
  "#9C27B0", // Purple
  "#F44336", // Red
  "#00BCD4", // Cyan
  "#8BC34A", // Light Green
  "#FF5722", // Deep Orange
  "#673AB7", // Deep Purple
  "#009688", // Teal
  "#E91E63", // Pink
  "#3F51B5", // Indigo
  "#CDDC39", // Lime
  "#FFC107", // Amber
  "#795548", // Brown
  "#607D8B", // Blue Grey
];

// Get a random agent color
export function getRandomAgentColor(): string {
  return agentColors[Math.floor(Math.random() * agentColors.length)];
}
