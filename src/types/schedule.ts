import { z } from "zod";

// Schedule entry schema
export const scheduleEntrySchema = z.object({
  agentId: z.string().min(1, "Agent is required"),
  activityTypeId: z.string().min(1, "Activity type is required"),
  date: z.string(), // YYYY-MM-DD format
  startTime: z.string(), // HH:MM format
  endTime: z.string(), // HH:MM format
  notes: z.string().optional().nullable(),
});

export type ScheduleEntryInput = z.infer<typeof scheduleEntrySchema>;

// Time slot representation
export interface TimeSlot {
  time: string; // HH:MM format
  hour: number;
  minute: number;
}

// Generate all 30-minute time slots for a day
export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        hour,
        minute,
      });
    }
  }
  return slots;
}

// Get time slot index from time string
export function getTimeSlotIndex(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 2 + (minutes >= 30 ? 1 : 0);
}

// Get time string from slot index
export function getTimeFromSlotIndex(index: number): string {
  const hour = Math.floor(index / 2);
  const minute = (index % 2) * 30;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Calculate number of slots between two times
export function getSlotSpan(startTime: string, endTime: string): number {
  const startIndex = getTimeSlotIndex(startTime);
  const endIndex = getTimeSlotIndex(endTime);
  return endIndex - startIndex;
}

// Format time for display
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

// Snap time to nearest 30-minute interval
export function snapToInterval(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const snappedMinutes = minutes < 15 ? 0 : minutes < 45 ? 30 : 0;
  const snappedHours = minutes >= 45 ? (hours + 1) % 24 : hours;
  return `${snappedHours.toString().padStart(2, "0")}:${snappedMinutes.toString().padStart(2, "0")}`;
}
