import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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

// GET /api/schedule/[id] - Get a single schedule entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const entry = await prisma.scheduleEntry.findUnique({
      where: { id },
      include: {
        activityType: true,
        agent: true,
      },
    });

    if (!entry) {
      return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: entry.id,
      agentId: entry.agentId,
      activityTypeId: entry.activityTypeId,
      date: entry.date.toISOString().split("T")[0],
      startTime: formatTime(entry.startTime),
      endTime: formatTime(entry.endTime),
      notes: entry.notes,
      activityType: entry.activityType,
      agent: entry.agent,
    });
  } catch (error) {
    console.error("Error fetching schedule entry:", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule entry" },
      { status: 500 }
    );
  }
}

// PATCH /api/schedule/[id] - Update a schedule entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const entry = await prisma.scheduleEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      modifiedById: session.user.id,
    };

    if (body.agentId !== undefined) updateData.agentId = body.agentId;
    if (body.activityTypeId !== undefined) updateData.activityTypeId = body.activityTypeId;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Handle date and time updates
    if (body.date !== undefined) {
      updateData.date = new Date(body.date);
    }

    if (body.startTime !== undefined) {
      const dateToUse = body.date ? new Date(body.date) : entry.date;
      updateData.startTime = parseTimeToDate(dateToUse, body.startTime);
    }

    if (body.endTime !== undefined) {
      const dateToUse = body.date ? new Date(body.date) : entry.date;
      updateData.endTime = parseTimeToDate(dateToUse, body.endTime);
    }

    const updatedEntry = await prisma.scheduleEntry.update({
      where: { id },
      data: updateData,
      include: {
        activityType: true,
        agent: true,
      },
    });

    return NextResponse.json({
      id: updatedEntry.id,
      agentId: updatedEntry.agentId,
      activityTypeId: updatedEntry.activityTypeId,
      date: updatedEntry.date.toISOString().split("T")[0],
      startTime: formatTime(updatedEntry.startTime),
      endTime: formatTime(updatedEntry.endTime),
      notes: updatedEntry.notes,
    });
  } catch (error) {
    console.error("Error updating schedule entry:", error);
    return NextResponse.json(
      { error: "Failed to update schedule entry" },
      { status: 500 }
    );
  }
}

// DELETE /api/schedule/[id] - Delete a schedule entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const entry = await prisma.scheduleEntry.findUnique({
      where: { id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
    }

    await prisma.scheduleEntry.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Schedule entry deleted" });
  } catch (error) {
    console.error("Error deleting schedule entry:", error);
    return NextResponse.json(
      { error: "Failed to delete schedule entry" },
      { status: 500 }
    );
  }
}
