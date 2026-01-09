import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/agents - List all agents
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");
    const activeOnly = searchParams.get("active") !== "false";
    const departmentId = searchParams.get("departmentId");

    const where: {
      isActive?: boolean;
      departmentId?: string | null;
      OR?: Array<{
        firstName?: { contains: string; mode: "insensitive" };
        lastName?: { contains: string; mode: "insensitive" };
        email?: { contains: string; mode: "insensitive" };
        employeeId?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
      ];
    }

    const agents = await prisma.agent.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { firstName: "asc" }],
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

    // Transform to include hasFaceDescriptor flag
    const result = agents.map((agent) => ({
      ...agent,
      techEnrollment: agent.techEnrollment
        ? {
            id: agent.techEnrollment.id,
            referencePhotoUrl: agent.techEnrollment.referencePhotoUrl,
            hasFaceDescriptor: !!agent.techEnrollment.faceDescriptor,
          }
        : null,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching agents:", error);
    return NextResponse.json(
      { error: "Failed to fetch agents" },
      { status: 500 }
    );
  }
}

// POST /api/agents - Create a new agent
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      hireDate,
      color,
      title,
      dateOfBirth,
      departmentId,
      employmentTypeId,
      reportsToId,
      emergencyContact,
    } = body;

    if (!employeeId || !firstName || !lastName || !email || !hireDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existingById = await prisma.agent.findUnique({
      where: { employeeId },
    });
    if (existingById) {
      return NextResponse.json(
        { error: "An agent with this employee ID already exists" },
        { status: 409 }
      );
    }

    const existingByEmail = await prisma.agent.findUnique({
      where: { email },
    });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "An agent with this email already exists" },
        { status: 409 }
      );
    }

    // Get max display order
    const maxOrder = await prisma.agent.aggregate({
      _max: { displayOrder: true },
    });

    const agent = await prisma.agent.create({
      data: {
        employeeId,
        firstName,
        lastName,
        email,
        phone: phone || null,
        hireDate: new Date(hireDate),
        color: color || null,
        displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
        title: title || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        departmentId: departmentId || null,
        employmentTypeId: employmentTypeId || null,
        reportsToId: reportsToId || null,
        emergencyContact: emergencyContact || null,
      },
      include: {
        department: true,
        employmentType: true,
        reportsTo: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
