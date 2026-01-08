import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordPunchSchema } from "@/types/time-clock";

// POST /api/tech-portal/punch - Record clock in/out
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = recordPunchSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Find enrollment
    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        agent: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            isActive: true,
          },
        },
        punches: {
          orderBy: { punchTime: "desc" },
          take: 1,
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (!enrollment.agent.isActive) {
      return NextResponse.json(
        { error: "Employee account is inactive" },
        { status: 403 }
      );
    }

    // Check for valid punch sequence (can't clock in if already clocked in, etc.)
    const lastPunch = enrollment.punches[0];
    if (lastPunch) {
      if (data.punchType === "CLOCK_IN" && lastPunch.punchType === "CLOCK_IN") {
        return NextResponse.json(
          { error: "Already clocked in. Please clock out first." },
          { status: 400 }
        );
      }
      if (data.punchType === "CLOCK_OUT" && lastPunch.punchType === "CLOCK_OUT") {
        return NextResponse.json(
          { error: "Already clocked out. Please clock in first." },
          { status: 400 }
        );
      }
    } else {
      // First punch must be clock in
      if (data.punchType === "CLOCK_OUT") {
        return NextResponse.json(
          { error: "No clock in record found. Please clock in first." },
          { status: 400 }
        );
      }
    }

    // Get client info
    const userAgent = request.headers.get("user-agent") || undefined;
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor?.split(",")[0]?.trim() ||
                      request.headers.get("x-real-ip") ||
                      undefined;

    // Create punch record
    const punch = await prisma.timePunch.create({
      data: {
        enrollmentId: data.enrollmentId,
        punchType: data.punchType,
        verificationMethod: data.verificationMethod,
        faceConfidence: data.faceConfidence,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        address: data.address,
        userAgent,
        ipAddress,
      },
      include: {
        enrollment: {
          include: {
            agent: {
              select: {
                firstName: true,
                lastName: true,
                employeeId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      id: punch.id,
      punchType: punch.punchType,
      punchTime: punch.punchTime.toISOString(),
      verificationMethod: punch.verificationMethod,
      faceConfidence: punch.faceConfidence,
      latitude: punch.latitude,
      longitude: punch.longitude,
      accuracy: punch.accuracy,
      address: punch.address,
      agent: punch.enrollment.agent,
      message: `Successfully ${punch.punchType === "CLOCK_IN" ? "clocked in" : "clocked out"}`,
    });
  } catch (error) {
    console.error("Error recording punch:", error);
    return NextResponse.json(
      { error: "Failed to record punch" },
      { status: 500 }
    );
  }
}
