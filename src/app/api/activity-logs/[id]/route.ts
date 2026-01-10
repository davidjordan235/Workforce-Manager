import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { activityLogSchema } from "@/types/activity-log";
import { parse, format } from "date-fns";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/activity-logs/[id] - Get a single activity log
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const activityLog = await prisma.activityLog.findUnique({
      where: { id },
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!activityLog) {
      return NextResponse.json(
        { error: "Activity log not found" },
        { status: 404 }
      );
    }

    // Regular agents can only see their own logs
    if (session.user.role === "AGENT") {
      const agent = await prisma.agent.findFirst({
        where: { email: session.user.email },
      });
      if (!agent || agent.id !== activityLog.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json({
      ...activityLog,
      date: format(activityLog.date, "yyyy-MM-dd"),
      startTime: activityLog.startTime.toISOString(),
      endTime: activityLog.endTime.toISOString(),
      createdAt: activityLog.createdAt.toISOString(),
      updatedAt: activityLog.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching activity log:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity log" },
      { status: 500 }
    );
  }
}

// PATCH /api/activity-logs/[id] - Update an activity log
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.activityLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Activity log not found" },
        { status: 404 }
      );
    }

    // Regular agents can only update their own logs
    if (session.user.role === "AGENT") {
      const agent = await prisma.agent.findFirst({
        where: { email: session.user.email },
      });
      if (!agent || agent.id !== existing.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const validationResult = activityLogSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;
    const updateData: {
      date?: Date;
      startTime?: Date;
      endTime?: Date;
      description?: string;
      category?: string | null;
      notes?: string | null;
    } = {};

    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const baseDate = data.date ? new Date(data.date) : existing.date;

    if (data.startTime) {
      updateData.startTime = parse(data.startTime, "HH:mm", baseDate);
    }

    if (data.endTime) {
      updateData.endTime = parse(data.endTime, "HH:mm", baseDate);
    }

    // Validate times if both are provided or if updating one
    const finalStartTime = updateData.startTime || existing.startTime;
    const finalEndTime = updateData.endTime || existing.endTime;
    if (finalEndTime <= finalStartTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.category !== undefined) {
      updateData.category = data.category || null;
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }

    const activityLog = await prisma.activityLog.update({
      where: { id },
      data: updateData,
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ...activityLog,
      date: format(activityLog.date, "yyyy-MM-dd"),
      startTime: activityLog.startTime.toISOString(),
      endTime: activityLog.endTime.toISOString(),
      createdAt: activityLog.createdAt.toISOString(),
      updatedAt: activityLog.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating activity log:", error);
    return NextResponse.json(
      { error: "Failed to update activity log" },
      { status: 500 }
    );
  }
}

// DELETE /api/activity-logs/[id] - Delete an activity log
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.activityLog.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Activity log not found" },
        { status: 404 }
      );
    }

    // Regular agents can only delete their own logs
    if (session.user.role === "AGENT") {
      const agent = await prisma.agent.findFirst({
        where: { email: session.user.email },
      });
      if (!agent || agent.id !== existing.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.activityLog.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Activity log deleted" });
  } catch (error) {
    console.error("Error deleting activity log:", error);
    return NextResponse.json(
      { error: "Failed to delete activity log" },
      { status: 500 }
    );
  }
}
