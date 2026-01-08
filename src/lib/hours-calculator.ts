import {
  AdminTimePunchResponse,
  PunchPair,
  DailyHours,
  EmployeeHoursSummary,
  PunchType,
  VerificationMethod,
} from "@/types/time-clock";

/**
 * Calculate hours between two dates in decimal format
 * e.g., 8.5 for 8 hours 30 minutes
 */
function calculateHoursBetween(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
}

/**
 * Get the date string (YYYY-MM-DD) from an ISO datetime string
 */
function getDateString(isoDatetime: string): string {
  return isoDatetime.split("T")[0];
}

/**
 * Group punches by employee enrollment
 */
function groupByEnrollment(
  punches: AdminTimePunchResponse[]
): Map<string, AdminTimePunchResponse[]> {
  const groups = new Map<string, AdminTimePunchResponse[]>();

  for (const punch of punches) {
    const enrollmentId = punch.enrollment.id;
    if (!groups.has(enrollmentId)) {
      groups.set(enrollmentId, []);
    }
    groups.get(enrollmentId)!.push(punch);
  }

  return groups;
}

/**
 * Group punches by date
 */
function groupByDate(
  punches: AdminTimePunchResponse[]
): Map<string, AdminTimePunchResponse[]> {
  const groups = new Map<string, AdminTimePunchResponse[]>();

  for (const punch of punches) {
    const dateStr = getDateString(punch.punchTime);
    if (!groups.has(dateStr)) {
      groups.set(dateStr, []);
    }
    groups.get(dateStr)!.push(punch);
  }

  return groups;
}

/**
 * Pair clock-in and clock-out punches for a single day
 * Matches each clock-in with the next clock-out
 */
function pairPunchesForDay(punches: AdminTimePunchResponse[]): PunchPair[] {
  // Sort by punch time
  const sorted = [...punches].sort(
    (a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime()
  );

  const pairs: PunchPair[] = [];
  let currentClockIn: AdminTimePunchResponse | null = null;

  for (const punch of sorted) {
    if (punch.punchType === PunchType.CLOCK_IN) {
      // If we have an unpaired clock-in, add it as incomplete
      if (currentClockIn) {
        pairs.push({
          clockIn: currentClockIn,
          clockOut: null,
          hours: null,
          isComplete: false,
        });
      }
      currentClockIn = punch;
    } else if (punch.punchType === PunchType.CLOCK_OUT) {
      if (currentClockIn) {
        // Pair with the current clock-in
        const hours = calculateHoursBetween(
          new Date(currentClockIn.punchTime),
          new Date(punch.punchTime)
        );
        pairs.push({
          clockIn: currentClockIn,
          clockOut: punch,
          hours,
          isComplete: true,
        });
        currentClockIn = null;
      } else {
        // Orphan clock-out (no matching clock-in)
        // We'll create a special incomplete pair
        pairs.push({
          clockIn: punch, // Use clock-out as the reference
          clockOut: null,
          hours: null,
          isComplete: false,
        });
      }
    }
  }

  // Handle any remaining unpaired clock-in
  if (currentClockIn) {
    pairs.push({
      clockIn: currentClockIn,
      clockOut: null,
      hours: null,
      isComplete: false,
    });
  }

  return pairs;
}

/**
 * Calculate daily hours from punch pairs
 */
export function calculateDailyHours(punches: AdminTimePunchResponse[]): DailyHours[] {
  const byDate = groupByDate(punches);
  const dailyHours: DailyHours[] = [];

  // Sort dates
  const sortedDates = Array.from(byDate.keys()).sort();

  for (const date of sortedDates) {
    const dayPunches = byDate.get(date)!;
    const pairs = pairPunchesForDay(dayPunches);

    const totalHours = pairs.reduce((sum, pair) => sum + (pair.hours || 0), 0);
    const hasIncomplete = pairs.some((pair) => !pair.isComplete);

    dailyHours.push({
      date,
      pairs,
      totalHours: Math.round(totalHours * 100) / 100,
      hasIncomplete,
    });
  }

  return dailyHours;
}

/**
 * Calculate weekly totals from daily hours
 */
export function calculateWeeklyTotal(dailyHours: DailyHours[]): number {
  return dailyHours.reduce((sum, day) => sum + day.totalHours, 0);
}

/**
 * Generate employee hours summary
 */
export function calculateEmployeeSummary(
  punches: AdminTimePunchResponse[]
): EmployeeHoursSummary[] {
  const byEnrollment = groupByEnrollment(punches);
  const summaries: EmployeeHoursSummary[] = [];

  for (const [enrollmentId, employeePunches] of byEnrollment) {
    const firstPunch = employeePunches[0];
    const dailyHours = calculateDailyHours(employeePunches);
    const weeklyTotal = calculateWeeklyTotal(dailyHours);

    const unverifiedCount = employeePunches.filter(
      (p) => p.verificationMethod === VerificationMethod.PIN_FALLBACK
    ).length;

    const manualCount = employeePunches.filter((p) => p.isManual).length;

    summaries.push({
      enrollmentId,
      employeeId: firstPunch.enrollment.agent.employeeId,
      firstName: firstPunch.enrollment.agent.firstName,
      lastName: firstPunch.enrollment.agent.lastName,
      dailyHours,
      weeklyTotal: Math.round(weeklyTotal * 100) / 100,
      unverifiedCount,
      manualCount,
    });
  }

  // Sort by last name, first name
  summaries.sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.firstName.localeCompare(b.firstName);
  });

  return summaries;
}

/**
 * Format hours as HH:MM (e.g., 8.5 -> "8:30")
 */
export function formatHoursAsTime(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  return `${wholeHours}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Format hours as decimal string (e.g., 8.5 -> "8.50")
 */
export function formatHoursDecimal(hours: number): string {
  return hours.toFixed(2);
}

/**
 * Get day of week from date string
 */
export function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * Get week start and end dates for a given date
 * Week starts on Monday
 */
export function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday

  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Format date as readable string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format time from ISO datetime
 */
export function formatTime(isoDatetime: string): string {
  const date = new Date(isoDatetime);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
