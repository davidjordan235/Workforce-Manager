import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { manualPunchSchema, VerificationMethod, AdminTimePunchResponse } from "@/types/time-clock";

// POST /api/time-punch/manual - Add a manual punch entry
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = manualPunchSchema.parse(body);

    // Verify enrollment exists
    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id: validated.enrollmentId },
      include: {
        agent: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
    }

    // Create the manual punch
    const punch = await prisma.timePunch.create({
      data: {
        enrollmentId: validated.enrollmentId,
        punchType: validated.punchType,
        punchTime: new Date(validated.punchTime),
        verificationMethod: VerificationMethod.PIN_FALLBACK, // Manual punches are always unverified
        isManual: true,
        manualNote: validated.note,
        editedById: session.user.id,
        editedAt: new Date(),
      },
      include: {
        enrollment: {
          include: {
            agent: {
              select: {
                id: true,
                employeeId: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        editedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const response: AdminTimePunchResponse = {
      id: punch.id,
      punchType: punch.punchType,
      punchTime: punch.punchTime.toISOString(),
      verificationMethod: punch.verificationMethod,
      faceConfidence: punch.faceConfidence,
      latitude: punch.latitude,
      longitude: punch.longitude,
      accuracy: punch.accuracy,
      address: punch.address,
      isManual: punch.isManual,
      manualNote: punch.manualNote,
      editedAt: punch.editedAt?.toISOString() || null,
      editedBy: punch.editedBy,
      originalPunchTime: punch.originalPunchTime?.toISOString() || null,
      createdAt: punch.createdAt.toISOString(),
      enrollment: {
        id: punch.enrollment.id,
        agent: punch.enrollment.agent,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating manual punch:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create manual punch" }, { status: 500 });
  }
}
