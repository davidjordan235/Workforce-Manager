import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { uploadPhotoSchema } from "@/types/time-clock";

// POST /api/tech-enrollment/[id]/photo - Upload reference photo
export async function POST(
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
    const validationResult = uploadPhotoSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { imageData, faceDescriptor } = validationResult.data;

    // Check if enrollment exists
    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id },
      include: {
        agent: true,
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Decode base64 image
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Create directory for agent photos
    const uploadDir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "tech-photos",
      enrollment.agentId
    );
    await mkdir(uploadDir, { recursive: true });

    // Generate filename with timestamp
    const filename = `reference-${Date.now()}.jpg`;
    const filepath = path.join(uploadDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // URL path for the image
    const photoUrl = `/uploads/tech-photos/${enrollment.agentId}/${filename}`;

    // Update enrollment with photo URL and face descriptor
    const updatedEnrollment = await prisma.techEnrollment.update({
      where: { id },
      data: {
        referencePhotoUrl: photoUrl,
        faceDescriptor: faceDescriptor,
      },
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
      id: updatedEnrollment.id,
      agentId: updatedEnrollment.agentId,
      agent: updatedEnrollment.agent,
      referencePhotoUrl: updatedEnrollment.referencePhotoUrl,
      hasFaceDescriptor: updatedEnrollment.faceDescriptor !== null,
      enrollmentLat: updatedEnrollment.enrollmentLat,
      enrollmentLng: updatedEnrollment.enrollmentLng,
      enrollmentAddress: updatedEnrollment.enrollmentAddress,
      enrolledAt: updatedEnrollment.enrolledAt.toISOString(),
      enrolledBy: updatedEnrollment.enrolledBy,
    });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      { error: "Failed to upload photo" },
      { status: 500 }
    );
  }
}

// DELETE /api/tech-enrollment/[id]/photo - Delete reference photo
export async function DELETE(
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

    // Check if enrollment exists
    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    // Delete the photo file if it exists
    if (enrollment.referencePhotoUrl) {
      const filepath = path.join(process.cwd(), "public", enrollment.referencePhotoUrl);
      try {
        await unlink(filepath);
      } catch {
        // File may not exist, continue anyway
        console.warn("Could not delete photo file:", filepath);
      }
    }

    // Update enrollment to remove photo URL and face descriptor
    const updatedEnrollment = await prisma.techEnrollment.update({
      where: { id },
      data: {
        referencePhotoUrl: null,
        faceDescriptor: Prisma.DbNull,
      },
    });

    return NextResponse.json({
      id: updatedEnrollment.id,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    return NextResponse.json(
      { error: "Failed to delete photo" },
      { status: 500 }
    );
  }
}
