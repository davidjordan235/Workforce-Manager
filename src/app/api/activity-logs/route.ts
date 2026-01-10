import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { activityLogSchema } from "@/types/activity-log";
import { parse, format } from "date-fns";

// GET /api/activity-logs - List activity logs with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get("agentId");
    const departmentId = searchParams.get("departmentId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const category = searchParams.get("category");

    const where: {
      agentId?: string;
      date?: { gte?: Date; lte?: Date };
      category?: string;
      agent?: { departmentId?: string };
    } = {};

    // Regular agents can only see their own logs
    if (session.user.role === "AGENT") {
      // Find the agent linked to this user
      const agent = await prisma.agent.findFirst({
        where: { email: session.user.email },
      });
      if (agent) {
        where.agentId = agent.id;
      }
    } else if (agentId) {
      where.agentId = agentId;
    }

    if (departmentId) {
      where.agent = { departmentId };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (category) {
      where.category = category;
    }

    const activityLogs = await prisma.activityLog.findMany({
      where,
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
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

    // Transform dates to ISO strings
    const result = activityLogs.map((log) => ({
      ...log,
      date: format(log.date, "yyyy-MM-dd"),
      startTime: log.startTime.toISOString(),
      endTime: log.endTime.toISOString(),
      createdAt: log.createdAt.toISOString(),
      updatedAt: log.updatedAt.toISOString(),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}

// POST /api/activity-logs - Create a new activity log
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = activityLogSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Regular agents can only create logs for themselves
    if (session.user.role === "AGENT") {
      const agent = await prisma.agent.findFirst({
        where: { email: session.user.email },
      });
      if (!agent || agent.id !== data.agentId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Verify the agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Parse date and times
    const activityDate = new Date(data.date);
    const startTime = parse(data.startTime, "HH:mm", activityDate);
    const endTime = parse(data.endTime, "HH:mm", activityDate);

    // Validate times
    if (endTime <= startTime) {
      return NextResponse.json(
        { error: "End time must be after start time" },
        { status: 400 }
      );
    }

    const activityLog = await prisma.activityLog.create({
      data: {
        agentId: data.agentId,
        date: activityDate,
        startTime,
        endTime,
        description: data.description,
        category: data.category || null,
        notes: data.notes || null,
      },
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

    return NextResponse.json(
      {
        ...activityLog,
        date: format(activityLog.date, "yyyy-MM-dd"),
        startTime: activityLog.startTime.toISOString(),
        endTime: activityLog.endTime.toISOString(),
        createdAt: activityLog.createdAt.toISOString(),
        updatedAt: activityLog.updatedAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating activity log:", error);
    return NextResponse.json(
      { error: "Failed to create activity log" },
      { status: 500 }
    );
  }
}
