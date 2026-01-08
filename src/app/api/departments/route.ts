import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { departmentSchema } from "@/types/employee";

// GET /api/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false";

    const where: { isActive?: boolean } = {};

    if (activeOnly) {
      where.isActive = true;
    }

    const departments = await prisma.department.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create a new department
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create departments
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = departmentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if name already exists
    const existing = await prisma.department.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A department with this name already exists" },
        { status: 409 }
      );
    }

    // Get the max display order
    const maxOrder = await prisma.department.aggregate({
      _max: { displayOrder: true },
    });

    const department = await prisma.department.create({
      data: {
        ...data,
        displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
