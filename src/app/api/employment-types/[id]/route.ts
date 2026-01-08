import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { employmentTypeSchema } from "@/types/employee";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/employment-types/[id] - Get a single employment type
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const employmentType = await prisma.employmentType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { agents: true },
        },
      },
    });

    if (!employmentType) {
      return NextResponse.json(
        { error: "Employment type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(employmentType);
  } catch (error) {
    console.error("Error fetching employment type:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment type" },
      { status: 500 }
    );
  }
}

// PATCH /api/employment-types/[id] - Update an employment type
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can update employment types
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if employment type exists
    const existing = await prisma.employmentType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Employment type not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validationResult = employmentTypeSchema.partial().safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if new name conflicts with another employment type
    if (data.name && data.name !== existing.name) {
      const nameConflict = await prisma.employmentType.findUnique({
        where: { name: data.name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "An employment type with this name already exists" },
          { status: 409 }
        );
      }
    }

    const employmentType = await prisma.employmentType.update({
      where: { id },
      data,
    });

    return NextResponse.json(employmentType);
  } catch (error) {
    console.error("Error updating employment type:", error);
    return NextResponse.json(
      { error: "Failed to update employment type" },
      { status: 500 }
    );
  }
}

// DELETE /api/employment-types/[id] - Soft delete an employment type
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can delete employment types
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // Check if employment type exists
    const existing = await prisma.employmentType.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Employment type not found" },
        { status: 404 }
      );
    }

    // Check if employment type is in use
    const usageCount = await prisma.agent.count({
      where: { employmentTypeId: id },
    });

    if (usageCount > 0) {
      // Soft delete - just mark as inactive
      const employmentType = await prisma.employmentType.update({
        where: { id },
        data: { isActive: false },
      });

      return NextResponse.json({
        ...employmentType,
        _message: "Employment type deactivated (in use by employees)",
      });
    }

    // Hard delete if not in use
    await prisma.employmentType.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Employment type deleted" });
  } catch (error) {
    console.error("Error deleting employment type:", error);
    return NextResponse.json(
      { error: "Failed to delete employment type" },
      { status: 500 }
    );
  }
}
