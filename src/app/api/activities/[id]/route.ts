import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { activityTypeSchema } from "@/types/activity";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/activities/[id] - Get a single activity type
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const activityType = await prisma.activityType.findUnique({
      where: { id },
    });

    if (!activityType) {
      return NextResponse.json(
        { error: "Activity type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(activityType);
  } catch (error) {
    console.error("Error fetching activity type:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity type" },
      { status: 500 }
    );
  }
}

// PUT /api/activities/[id] - Update an activity type
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update activity types
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if activity type exists
    const existing = await prisma.activityType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Activity type not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = activityTypeSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if new name conflicts with another activity type
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.activityType.findUnique({
        where: { name: data.name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "An activity type with this name already exists" },
          { status: 409 }
        );
      }
    }

    const activityType = await prisma.activityType.update({
      where: { id },
      data,
    });

    return NextResponse.json(activityType);
  } catch (error) {
    console.error("Error updating activity type:", error);
    return NextResponse.json(
      { error: "Failed to update activity type" },
      { status: 500 }
    );
  }
}

// DELETE /api/activities/[id] - Soft delete an activity type
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete activity types
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if activity type exists
    const existing = await prisma.activityType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Activity type not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of system types
    if (existing.isSystemType) {
      return NextResponse.json(
        { error: "Cannot delete system activity types" },
        { status: 403 }
      );
    }

    // Check if activity type is in use
    const usageCount = await prisma.scheduleEntry.count({
      where: { activityTypeId: id },
    });

    if (usageCount > 0) {
      // Soft delete - just mark as inactive
      const activityType = await prisma.activityType.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        ...activityType,
        _message: "Activity type deactivated (in use by schedule entries)",
      });
    }

    // Hard delete if not in use
    await prisma.activityType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Activity type deleted" });
  } catch (error) {
    console.error("Error deleting activity type:", error);
    return NextResponse.json(
      { error: "Failed to delete activity type" },
      { status: 500 }
    );
  }
}
