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

// Extended time slot with day offset for 36-hour view
export interface ExtendedTimeSlot extends TimeSlot {
  dayOffset: number; // 0 = current day, 1 = next day
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
// isEndTime: if true, treats 00:00 as end of day (index 48) instead of start (index 0)
export function getTimeSlotIndex(time: string, isEndTime: boolean = false): number {
  const [hours, minutes] = time.split(":").map(Number);
  // Handle midnight (00:00) as end of day when used as end time
  if (isEndTime && hours === 0 && minutes === 0) {
    return 48; // End of day (24:00)
  }
  return hours * 2 + (minutes >= 30 ? 1 : 0);
}

// Get time string from slot index
export function getTimeFromSlotIndex(index: number): string {
  // Handle end-of-day (index 48 = 24:00 which is 00:00 next day)
  if (index >= 48) {
    return "00:00"; // Midnight
  }
  const hour = Math.floor(index / 2);
  const minute = (index % 2) * 30;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

// Check if a shift is overnight (crosses midnight)
export function isOvernightShift(startTime: string, endTime: string): boolean {
  const startIndex = getTimeSlotIndex(startTime, false);
  const endIndex = getTimeSlotIndex(endTime, false); // Use raw index for comparison
  // If end is 00:00, it could be end of same day OR next day
  // We treat it as overnight if end time appears "before" start time
  // Exception: if endTime is 00:00, use isEndTime logic unless start is also early morning
  if (endTime === "00:00") {
    return false; // 00:00 as end time means end of same day (midnight)
  }
  return endIndex <= startIndex && endIndex !== 0;
}

// Calculate number of slots between two times (handles overnight shifts)
export function getSlotSpan(startTime: string, endTime: string): number {
  const startIndex = getTimeSlotIndex(startTime, false);

  // Check for overnight shift
  if (isOvernightShift(startTime, endTime)) {
    // Overnight: slots from start to midnight + slots from midnight to end
    const endIndex = getTimeSlotIndex(endTime, false);
    return (48 - startIndex) + endIndex;
  }

  // Same day: use normal calculation
  const endIndex = getTimeSlotIndex(endTime, true); // End time uses isEndTime=true for midnight
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

// Constants for extended 36-hour view
export const EXTENDED_SLOTS = 72; // 36 hours x 2 slots per hour
export const MIDNIGHT_SLOT_INDEX = 48; // Where midnight falls in extended view

// Generate extended time slots for 36-hour view (current day 00:00 to next day 12:00)
export function generateExtendedTimeSlots(): ExtendedTimeSlot[] {
  const slots: ExtendedTimeSlot[] = [];

  // Day 0: 00:00 - 23:30 (48 slots, indices 0-47)
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        hour,
        minute,
        dayOffset: 0,
      });
    }
  }

  // Day 1: 00:00 - 11:30 (24 slots, indices 48-71)
  for (let hour = 0; hour < 12; hour++) {
    for (const minute of [0, 30]) {
      slots.push({
        time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        hour,
        minute,
        dayOffset: 1,
      });
    }
  }

  return slots;
}

// Get extended slot index for an entry based on its date relative to base date
export function getExtendedSlotIndex(
  time: string,
  entryDate: string,
  baseDate: string,
  isEndTime: boolean = false
): number {
  const baseIndex = getTimeSlotIndex(time, false);

  // Parse dates for comparison (YYYY-MM-DD format)
  const entryDateObj = new Date(entryDate + "T00:00:00");
  const baseDateObj = new Date(baseDate + "T00:00:00");
  const dayDiff = Math.round((entryDateObj.getTime() - baseDateObj.getTime()) / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) {
    // Same day - check for midnight end time
    if (isEndTime && time === "00:00") {
      return 48; // End at midnight = slot 48
    }
    return baseIndex;
  } else if (dayDiff === 1) {
    // Next day - offset by 48 slots
    return 48 + baseIndex;
  }

  // Out of range - return base index as fallback
  return baseIndex;
}

// Convert extended slot index back to time and date
export function getTimeAndDateFromExtendedIndex(
  slotIndex: number,
  baseDate: string
): { time: string; date: string } {
  if (slotIndex < 48) {
    // Current day
    return {
      time: getTimeFromSlotIndex(slotIndex),
      date: baseDate,
    };
  } else {
    // Next day
    const nextDate = addDays(baseDate, 1);
    return {
      time: getTimeFromSlotIndex(slotIndex - 48),
      date: nextDate,
    };
  }
}

// Helper to add days to a date string (YYYY-MM-DD)
function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}
