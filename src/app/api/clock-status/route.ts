import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/clock-status - Get current clock-in status for all enrolled employees
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all enrolled agents with their most recent punch
    const enrollments = await prisma.techEnrollment.findMany({
      include: {
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            color: true,
            isActive: true,
            departmentId: true,
            department: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        punches: {
          orderBy: { punchTime: "desc" },
          take: 1,
        },
      },
    });

    // Build a map of agentId -> clock status
    const clockStatus: Record<string, {
      isClockedIn: boolean;
      lastPunchTime: string | null;
      lastPunchType: string | null;
      firstName: string;
      lastName: string;
      color: string | null;
      departmentId: string | null;
      departmentName: string | null;
    }> = {};

    for (const enrollment of enrollments) {
      if (!enrollment.agent.isActive) continue;

      const lastPunch = enrollment.punches[0];
      const isClockedIn = lastPunch?.punchType === "CLOCK_IN";

      clockStatus[enrollment.agentId] = {
        isClockedIn,
        lastPunchTime: lastPunch?.punchTime.toISOString() || null,
        lastPunchType: lastPunch?.punchType || null,
        firstName: enrollment.agent.firstName,
        lastName: enrollment.agent.lastName,
        color: enrollment.agent.color,
        departmentId: enrollment.agent.departmentId,
        departmentName: enrollment.agent.department?.name || null,
      };
    }

    return NextResponse.json(clockStatus);
  } catch (error) {
    console.error("Error fetching clock status:", error);
    return NextResponse.json(
      { error: "Failed to fetch clock status" },
      { status: 500 }
    );
  }
}
