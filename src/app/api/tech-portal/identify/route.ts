import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { identifyTechSchema } from "@/types/time-clock";

// POST /api/tech-portal/identify - Identify tech by employee ID
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = identifyTechSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { employeeId } = validationResult.data;

    // Find agent by employee ID
    const agent = await prisma.agent.findUnique({
      where: { employeeId },
      include: {
        techEnrollment: {
          include: {
            punches: {
              orderBy: { punchTime: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (!agent.isActive) {
      return NextResponse.json(
        { error: "Employee account is inactive" },
        { status: 403 }
      );
    }

    if (!agent.techEnrollment) {
      return NextResponse.json(
        { error: "Employee is not enrolled in time clock system" },
        { status: 404 }
      );
    }

    const enrollment = agent.techEnrollment;
    const lastPunch = enrollment.punches[0] || null;

    // Determine current status based on last punch
    let currentStatus: "clocked_in" | "clocked_out" = "clocked_out";
    if (lastPunch && lastPunch.punchType === "CLOCK_IN") {
      currentStatus = "clocked_in";
    }

    return NextResponse.json({
      enrollment: {
        id: enrollment.id,
        agentId: agent.id,
        agent: {
          id: agent.id,
          employeeId: agent.employeeId,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email,
        },
        referencePhotoUrl: enrollment.referencePhotoUrl,
        hasFaceDescriptor: enrollment.faceDescriptor !== null,
        faceDescriptor: enrollment.faceDescriptor, // Send for client-side comparison
      },
      lastPunch: lastPunch
        ? {
            id: lastPunch.id,
            punchType: lastPunch.punchType,
            punchTime: lastPunch.punchTime.toISOString(),
            verificationMethod: lastPunch.verificationMethod,
          }
        : null,
      currentStatus,
    });
  } catch (error) {
    console.error("Error identifying tech:", error);
    return NextResponse.json(
      { error: "Failed to identify employee" },
      { status: 500 }
    );
  }
}
