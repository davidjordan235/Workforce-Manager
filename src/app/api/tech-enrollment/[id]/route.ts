import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { updateEnrollmentSchema } from "@/types/time-clock";

// GET /api/tech-enrollment/[id] - Get single enrollment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id },
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
        enrolledBy: {
          select: {
            id: true,
            name: true,
          },
        },
        punches: {
          orderBy: { punchTime: "desc" },
          take: 10, // Last 10 punches
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: enrollment.id,
      agentId: enrollment.agentId,
      agent: enrollment.agent,
      referencePhotoUrl: enrollment.referencePhotoUrl,
      hasFaceDescriptor: enrollment.faceDescriptor !== null,
      enrollmentLat: enrollment.enrollmentLat,
      enrollmentLng: enrollment.enrollmentLng,
      enrollmentAddress: enrollment.enrollmentAddress,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      enrolledBy: enrollment.enrolledBy,
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
    console.error("Error fetching enrollment:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollment" },
      { status: 500 }
    );
  }
}

// PATCH /api/tech-enrollment/[id] - Update enrollment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = updateEnrollmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if enrollment exists
    const existingEnrollment = await prisma.techEnrollment.findUnique({
      where: { id },
    });
    if (!existingEnrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: {
      pin?: string;
      referencePhotoUrl?: string;
      faceDescriptor?: number[];
    } = {};

    if (data.pin) {
      updateData.pin = await bcrypt.hash(data.pin, 10);
    }
    if (data.referencePhotoUrl !== undefined) {
      updateData.referencePhotoUrl = data.referencePhotoUrl;
    }
    if (data.faceDescriptor !== undefined) {
      updateData.faceDescriptor = data.faceDescriptor;
    }

    const enrollment = await prisma.techEnrollment.update({
      where: { id },
      data: updateData,
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
        enrolledBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: enrollment.id,
      agentId: enrollment.agentId,
      agent: enrollment.agent,
      referencePhotoUrl: enrollment.referencePhotoUrl,
      hasFaceDescriptor: enrollment.faceDescriptor !== null,
      enrollmentLat: enrollment.enrollmentLat,
      enrollmentLng: enrollment.enrollmentLng,
      enrollmentAddress: enrollment.enrollmentAddress,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      enrolledBy: enrollment.enrolledBy,
    });
  } catch (error) {
    console.error("Error updating enrollment:", error);
    return NextResponse.json(
      { error: "Failed to update enrollment" },
      { status: 500 }
    );
  }
}

// DELETE /api/tech-enrollment/[id] - Delete enrollment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN can delete enrollments
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if enrollment exists
    const existingEnrollment = await prisma.techEnrollment.findUnique({
      where: { id },
    });
    if (!existingEnrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Delete enrollment (cascades to punches)
    await prisma.techEnrollment.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Enrollment deleted successfully" });
  } catch (error) {
    console.error("Error deleting enrollment:", error);
    return NextResponse.json(
      { error: "Failed to delete enrollment" },
      { status: 500 }
    );
  }
}
