import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { employmentTypeSchema } from "@/types/employee";

// GET /api/employment-types - List all employment types
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

    const employmentTypes = await prisma.employmentType.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(employmentTypes);
  } catch (error) {
    console.error("Error fetching employment types:", error);
    return NextResponse.json(
      { error: "Failed to fetch employment types" },
      { status: 500 }
    );
  }
}

// POST /api/employment-types - Create a new employment type
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create employment types
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = employmentTypeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if name already exists
    const existing = await prisma.employmentType.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An employment type with this name already exists" },
        { status: 409 }
      );
    }

    // Get the max display order
    const maxOrder = await prisma.employmentType.aggregate({
      _max: { displayOrder: true },
    });

    const employmentType = await prisma.employmentType.create({
      data: {
        ...data,
        displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
      },
    });

    return NextResponse.json(employmentType, { status: 201 });
  } catch (error) {
    console.error("Error creating employment type:", error);
    return NextResponse.json(
      { error: "Failed to create employment type" },
      { status: 500 }
    );
  }
}
