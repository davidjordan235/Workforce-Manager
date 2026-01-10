import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DashboardExceptions,
  TimeException,
  DepartureException,
  NoShowException,
  MissedPunchException,
} from "@/types/dashboard";

// Threshold in minutes for considering arrival/departure as early/late
const THRESHOLD_MINUTES = 5;

function formatTime(date: Date): string {
  return `${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
}

function getMinutesDiff(scheduled: Date, actual: Date): number {
  // Get minutes since midnight for both times (UTC)
  const scheduledMinutes = scheduled.getUTCHours() * 60 + scheduled.getUTCMinutes();
  const actualMinutes = actual.getUTCHours() * 60 + actual.getUTCMinutes();
  return actualMinutes - scheduledMinutes;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");

    // Default to today if no date provided
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      0, 0, 0, 0
    ));
    const endOfDay = new Date(Date.UTC(
      targetDate.getUTCFullYear(),
      targetDate.getUTCMonth(),
      targetDate.getUTCDate(),
      23, 59, 59, 999
    ));

    // Get all schedule entries for the date
    const scheduleEntries = await prisma.scheduleEntry.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
      },
    });

    // Get all punches for the date
    const punches = await prisma.timePunch.findMany({
      where: {
        punchTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        enrollment: {
          select: {
            agentId: true,
            agent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        punchTime: "asc",
      },
    });

    // Group punches by agent
    const punchesByAgent: Record<string, typeof punches> = {};
    for (const punch of punches) {
      const agentId = punch.enrollment.agentId;
      if (!punchesByAgent[agentId]) {
        punchesByAgent[agentId] = [];
      }
      punchesByAgent[agentId].push(punch);
    }

    // Initialize exception arrays
    const arrivedEarly: TimeException[] = [];
    const arrivedLate: TimeException[] = [];
    const leftEarly: DepartureException[] = [];
    const leftLate: DepartureException[] = [];
    const noShows: NoShowException[] = [];

    // Process each schedule entry
    for (const entry of scheduleEntries) {
      if (!entry.agent.isActive) continue;

      const agentId = entry.agentId;
      const agentName = `${entry.agent.firstName} ${entry.agent.lastName}`;
      const agentPunches = punchesByAgent[agentId] || [];

      // Find first clock-in and last clock-out
      const clockIns = agentPunches.filter(p => p.punchType === "CLOCK_IN");
      const clockOuts = agentPunches.filter(p => p.punchType === "CLOCK_OUT");

      if (clockIns.length === 0 && clockOuts.length === 0) {
        // No punches at all - check if scheduled time has passed
        const now = new Date();
        const graceTime = new Date(entry.startTime.getTime() + 30 * 60 * 1000); // 30 min grace

        if (now > graceTime) {
          noShows.push({
            agentId,
            agentName,
            scheduledStart: formatTime(entry.startTime),
            scheduledEnd: formatTime(entry.endTime),
          });
        }
        continue;
      }

      // Check arrival time (first clock-in vs scheduled start)
      if (clockIns.length > 0) {
        const firstClockIn = clockIns[0];
        const minutesDiff = getMinutesDiff(entry.startTime, firstClockIn.punchTime);

        if (minutesDiff < -THRESHOLD_MINUTES) {
          // Arrived early (negative diff means before scheduled)
          arrivedEarly.push({
            agentId,
            agentName,
            scheduledStart: formatTime(entry.startTime),
            actualStart: formatTime(firstClockIn.punchTime),
            minutesDiff,
          });
        } else if (minutesDiff > THRESHOLD_MINUTES) {
          // Arrived late
          arrivedLate.push({
            agentId,
            agentName,
            scheduledStart: formatTime(entry.startTime),
            actualStart: formatTime(firstClockIn.punchTime),
            minutesDiff,
          });
        }
      }

      // Check departure time (last clock-out vs scheduled end)
      if (clockOuts.length > 0) {
        const lastClockOut = clockOuts[clockOuts.length - 1];
        const minutesDiff = getMinutesDiff(entry.endTime, lastClockOut.punchTime);

        if (minutesDiff < -THRESHOLD_MINUTES) {
          // Left early (negative diff means before scheduled end)
          leftEarly.push({
            agentId,
            agentName,
            scheduledEnd: formatTime(entry.endTime),
            actualEnd: formatTime(lastClockOut.punchTime),
            minutesDiff,
          });
        } else if (minutesDiff > THRESHOLD_MINUTES) {
          // Left late
          leftLate.push({
            agentId,
            agentName,
            scheduledEnd: formatTime(entry.endTime),
            actualEnd: formatTime(lastClockOut.punchTime),
            minutesDiff,
          });
        }
      }
    }

    // Detect missed punches (consecutive same-type punches)
    const missedPunches: MissedPunchException[] = [];

    for (const [agentId, agentPunches] of Object.entries(punchesByAgent)) {
      if (agentPunches.length < 2) continue;

      const agent = agentPunches[0].enrollment.agent;
      const agentName = `${agent.firstName} ${agent.lastName}`;

      // Look for consecutive same-type punches
      for (let i = 1; i < agentPunches.length; i++) {
        const prevPunch = agentPunches[i - 1];
        const currPunch = agentPunches[i];

        if (prevPunch.punchType === currPunch.punchType) {
          // Found consecutive same-type punches
          const punchType = currPunch.punchType as "CLOCK_IN" | "CLOCK_OUT";
          const consecutiveTimes: string[] = [prevPunch.punchTime.toISOString()];

          // Check if there are more consecutive punches of the same type
          let j = i;
          while (j < agentPunches.length && agentPunches[j].punchType === punchType) {
            consecutiveTimes.push(agentPunches[j].punchTime.toISOString());
            j++;
          }

          const typeLabel = punchType === "CLOCK_IN" ? "clock-ins" : "clock-outs";
          missedPunches.push({
            agentId,
            agentName,
            punchType,
            punchTimes: consecutiveTimes,
            message: `${consecutiveTimes.length} consecutive ${typeLabel} without ${punchType === "CLOCK_IN" ? "clock-out" : "clock-in"}`,
          });

          // Skip ahead to avoid duplicate entries
          i = j - 1;
        }
      }
    }

    const response: DashboardExceptions = {
      arrivedEarly,
      arrivedLate,
      leftEarly,
      leftLate,
      noShows,
      missedPunches,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching dashboard exceptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard exceptions" },
      { status: 500 }
    );
  }
}
