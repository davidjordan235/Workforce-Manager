import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/schedule - Get schedule entries for a date range
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const agentId = searchParams.get("agentId");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const where: {
      date: { gte: Date; lte: Date };
      agentId?: string;
    } = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (agentId) {
      where.agentId = agentId;
    }

    const entries = await prisma.scheduleEntry.findMany({
      where,
      include: {
        activityType: true,
        agent: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // Transform to match expected format
    const transformed = entries.map((entry) => ({
      id: entry.id,
      agentId: entry.agentId,
      activityTypeId: entry.activityTypeId,
      date: entry.date.toISOString().split("T")[0],
      startTime: formatTime(entry.startTime),
      endTime: formatTime(entry.endTime),
      notes: entry.notes,
      activityType: entry.activityType,
      agent: entry.agent,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}

// POST /api/schedule - Create a new schedule entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, activityTypeId, date, startTime, endTime, notes } = body;

    if (!agentId || !activityTypeId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);
    const startDateTime = parseTimeToDate(dateObj, startTime);
    const endDateTime = parseTimeToDate(dateObj, endTime);

    const entry = await prisma.scheduleEntry.create({
      data: {
        agentId,
        activityTypeId,
        date: dateObj,
        startTime: startDateTime,
        endTime: endDateTime,
        notes: notes || null,
        createdById: session.user.id,
      },
      include: {
        activityType: true,
        agent: true,
      },
    });

    return NextResponse.json(
      {
        id: entry.id,
        agentId: entry.agentId,
        activityTypeId: entry.activityTypeId,
        date: entry.date.toISOString().split("T")[0],
        startTime: formatTime(entry.startTime),
        endTime: formatTime(entry.endTime),
        notes: entry.notes,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating schedule entry:", error);
    return NextResponse.json(
      { error: "Failed to create schedule entry" },
      { status: 500 }
    );
  }
}

// Helper to format DateTime to HH:MM string (using UTC to avoid timezone issues)
function formatTime(date: Date): string {
  const hours = date.getUTCHours().toString().padStart(2, "0");
  const minutes = date.getUTCMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Helper to parse HH:MM string to Date (using UTC to avoid timezone issues)
function parseTimeToDate(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}
