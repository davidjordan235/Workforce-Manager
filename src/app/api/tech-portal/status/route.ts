import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tech-portal/status?enrollmentId=xxx - Get current punch status
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const enrollmentId = searchParams.get("enrollmentId");

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Enrollment ID is required" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        agent: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          },
        },
        punches: {
          orderBy: { punchTime: "desc" },
          take: 10, // Return last 10 punches
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    const lastPunch = enrollment.punches[0] || null;
    let currentStatus: "clocked_in" | "clocked_out" = "clocked_out";
    if (lastPunch && lastPunch.punchType === "CLOCK_IN") {
      currentStatus = "clocked_in";
    }

    return NextResponse.json({
      enrollment: {
        id: enrollment.id,
        agentId: enrollment.agentId,
        agent: enrollment.agent,
        referencePhotoUrl: enrollment.referencePhotoUrl,
        hasFaceDescriptor: enrollment.faceDescriptor !== null,
      },
      lastPunch: lastPunch
        ? {
            id: lastPunch.id,
            punchType: lastPunch.punchType,
            punchTime: lastPunch.punchTime.toISOString(),
            verificationMethod: lastPunch.verificationMethod,
            latitude: lastPunch.latitude,
            longitude: lastPunch.longitude,
          }
        : null,
      currentStatus,
      recentPunches: enrollment.punches.map((p) => ({
        id: p.id,
        punchType: p.punchType,
        punchTime: p.punchTime.toISOString(),
        verificationMethod: p.verificationMethod,
        latitude: p.latitude,
        longitude: p.longitude,
      })),
    });
  } catch (error) {
    console.error("Error fetching status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
