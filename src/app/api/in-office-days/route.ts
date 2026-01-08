import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/in-office-days - Get in-office days for a date range
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

    const inOfficeDays = await prisma.inOfficeDay.findMany({
      where,
      select: {
        id: true,
        agentId: true,
        date: true,
      },
    });

    // Return as a simple map for easy lookup: { "agentId:date": true }
    const result = inOfficeDays.map((day) => ({
      agentId: day.agentId,
      date: day.date.toISOString().split("T")[0],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching in-office days:", error);
    return NextResponse.json(
      { error: "Failed to fetch in-office days" },
      { status: 500 }
    );
  }
}

// POST /api/in-office-days - Toggle in-office status for an agent on a date
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and supervisors can toggle in-office status
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { agentId, date } = body;

    if (!agentId || !date) {
      return NextResponse.json(
        { error: "agentId and date are required" },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);

    // Check if already marked as in-office
    const existing = await prisma.inOfficeDay.findUnique({
      where: {
        agentId_date: {
          agentId,
          date: dateObj,
        },
      },
    });

    if (existing) {
      // Remove the in-office designation
      await prisma.inOfficeDay.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ inOffice: false, agentId, date });
    } else {
      // Add the in-office designation
      await prisma.inOfficeDay.create({
        data: {
          agentId,
          date: dateObj,
        },
      });
      return NextResponse.json({ inOffice: true, agentId, date });
    }
  } catch (error) {
    console.error("Error toggling in-office status:", error);
    return NextResponse.json(
      { error: "Failed to toggle in-office status" },
      { status: 500 }
    );
  }
}
