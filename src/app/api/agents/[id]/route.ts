import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/agents/[id] - Get a single agent
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

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        department: true,
        employmentType: true,
        reportsTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        techEnrollment: {
          select: {
            id: true,
            referencePhotoUrl: true,
            faceDescriptor: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Transform to include hasFaceDescriptor flag
    const result = {
      ...agent,
      techEnrollment: agent.techEnrollment
        ? {
            id: agent.techEnrollment.id,
            referencePhotoUrl: agent.techEnrollment.referencePhotoUrl,
            hasFaceDescriptor: !!agent.techEnrollment.faceDescriptor,
          }
        : null,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching agent:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    );
  }
}

// PATCH /api/agents/[id] - Update an agent
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

    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.hireDate !== undefined) updateData.hireDate = new Date(body.hireDate);
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.displayOrder !== undefined) updateData.displayOrder = body.displayOrder;

    // New fields
    if (body.title !== undefined) updateData.title = body.title;
    if (body.dateOfBirth !== undefined) {
      updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.departmentId !== undefined) updateData.departmentId = body.departmentId || null;
    if (body.employmentTypeId !== undefined) updateData.employmentTypeId = body.employmentTypeId || null;
    if (body.reportsToId !== undefined) updateData.reportsToId = body.reportsToId || null;
    if (body.emergencyContact !== undefined) updateData.emergencyContact = body.emergencyContact;

    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: updateData,
      include: {
        department: true,
        employmentType: true,
        reportsTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updatedAgent);
  } catch (error) {
    console.error("Error updating agent:", error);
    return NextResponse.json(
      { error: "Failed to update agent" },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/[id] - Delete an agent
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
    }

    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Delete the agent (cascade will handle related records)
    await prisma.agent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Agent deleted" });
  } catch (error) {
    console.error("Error deleting agent:", error);
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    );
  }
}
