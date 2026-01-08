import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePunchSchema, AdminTimePunchResponse } from "@/types/time-clock";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/time-punch/[id] - Get single punch details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const punch = await prisma.timePunch.findUnique({
      where: { id },
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

    if (!punch) {
      return NextResponse.json({ error: "Punch not found" }, { status: 404 });
    }

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

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching punch:", error);
    return NextResponse.json({ error: "Failed to fetch punch" }, { status: 500 });
  }
}

// PATCH /api/time-punch/[id] - Update punch time
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validated = updatePunchSchema.parse(body);

    // Check if punch exists
    const existingPunch = await prisma.timePunch.findUnique({
      where: { id },
    });

    if (!existingPunch) {
      return NextResponse.json({ error: "Punch not found" }, { status: 404 });
    }

    // Store original punch time if this is the first edit
    const originalPunchTime = existingPunch.originalPunchTime || existingPunch.punchTime;

    // Update the punch
    const updatedPunch = await prisma.timePunch.update({
      where: { id },
      data: {
        punchTime: new Date(validated.punchTime),
        originalPunchTime,
        editedAt: new Date(),
        editedById: session.user.id,
        manualNote: validated.note, // Use the note to document the edit
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
      id: updatedPunch.id,
      punchType: updatedPunch.punchType,
      punchTime: updatedPunch.punchTime.toISOString(),
      verificationMethod: updatedPunch.verificationMethod,
      faceConfidence: updatedPunch.faceConfidence,
      latitude: updatedPunch.latitude,
      longitude: updatedPunch.longitude,
      accuracy: updatedPunch.accuracy,
      address: updatedPunch.address,
      isManual: updatedPunch.isManual,
      manualNote: updatedPunch.manualNote,
      editedAt: updatedPunch.editedAt?.toISOString() || null,
      editedBy: updatedPunch.editedBy,
      originalPunchTime: updatedPunch.originalPunchTime?.toISOString() || null,
      createdAt: updatedPunch.createdAt.toISOString(),
      enrollment: {
        id: updatedPunch.enrollment.id,
        agent: updatedPunch.enrollment.agent,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating punch:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input data" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update punch" }, { status: 500 });
  }
}

// DELETE /api/time-punch/[id] - Delete punch (admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete punches
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only administrators can delete punches" }, { status: 403 });
    }

    const { id } = await params;

    // Check if punch exists
    const existingPunch = await prisma.timePunch.findUnique({
      where: { id },
    });

    if (!existingPunch) {
      return NextResponse.json({ error: "Punch not found" }, { status: 404 });
    }

    // Delete the punch
    await prisma.timePunch.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting punch:", error);
    return NextResponse.json({ error: "Failed to delete punch" }, { status: 500 });
  }
}
