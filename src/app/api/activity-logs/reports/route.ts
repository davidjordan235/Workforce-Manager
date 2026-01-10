import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { differenceInMinutes, format } from "date-fns";
import { ActivityLogSummary, ActivityLogReport } from "@/types/activity-log";

// GET /api/activity-logs/reports - Get activity log reports
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and supervisors can view reports
    if (session.user.role === "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const departmentId = searchParams.get("departmentId");
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
      agent?: { departmentId?: string };
    } = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (agentId) {
      where.agentId = agentId;
    }

    if (departmentId) {
      where.agent = { departmentId };
    }

    const activityLogs = await prisma.activityLog.findMany({
      where,
      orderBy: [{ agentId: "asc" }, { date: "asc" }, { startTime: "asc" }],
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

    // Aggregate by agent
    const summariesMap: Record<string, ActivityLogSummary> = {};
    let totalMinutes = 0;
    let totalEntries = 0;

    for (const log of activityLogs) {
      const minutes = differenceInMinutes(log.endTime, log.startTime);
      const agentKey = log.agentId;

      if (!summariesMap[agentKey]) {
        summariesMap[agentKey] = {
          agentId: log.agent.id,
          agentName: `${log.agent.firstName} ${log.agent.lastName}`,
          department: log.agent.department?.name || null,
          totalMinutes: 0,
          entries: 0,
          byCategory: {},
        };
      }

      summariesMap[agentKey].totalMinutes += minutes;
      summariesMap[agentKey].entries += 1;
      totalMinutes += minutes;
      totalEntries += 1;

      // Track by category
      const category = log.category || "Uncategorized";
      if (!summariesMap[agentKey].byCategory[category]) {
        summariesMap[agentKey].byCategory[category] = 0;
      }
      summariesMap[agentKey].byCategory[category] += minutes;
    }

    const report: ActivityLogReport = {
      startDate,
      endDate,
      summaries: Object.values(summariesMap).sort((a, b) =>
        a.agentName.localeCompare(b.agentName)
      ),
      totalMinutes,
      totalEntries,
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating activity log report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
