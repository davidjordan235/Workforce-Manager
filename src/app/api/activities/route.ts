import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { activityTypeSchema } from "@/types/activity";
import { ActivityCategory } from "@prisma/client";

// GET /api/activities - List all activity types
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category") as ActivityCategory | null;
    const activeOnly = searchParams.get("active") !== "false";

    const where: { isActive?: boolean; category?: ActivityCategory } = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (category && Object.values(ActivityCategory).includes(category)) {
      where.category = category;
    }

    const activityTypes = await prisma.activityType.findMany({
      where,
      orderBy: [
        { category: "asc" },
        { displayOrder: "asc" },
        { name: "asc" },
      ],
    });

    return NextResponse.json(activityTypes);
  } catch (error) {
    console.error("Error fetching activity types:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity types" },
      { status: 500 }
    );
  }
}

// POST /api/activities - Create a new activity type
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can create activity types
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validationResult = activityTypeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if name already exists
    const existing = await prisma.activityType.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An activity type with this name already exists" },
        { status: 409 }
      );
    }

    // Get the max display order for the category
    const maxOrder = await prisma.activityType.aggregate({
      where: { category: data.category },
      _max: { displayOrder: true },
    });

    const activityType = await prisma.activityType.create({
      data: {
        ...data,
        displayOrder: data.displayOrder ?? (maxOrder._max.displayOrder ?? 0) + 1,
        isSystemType: false,
      },
    });

    return NextResponse.json(activityType, { status: 201 });
  } catch (error) {
    console.error("Error creating activity type:", error);
    return NextResponse.json(
      { error: "Failed to create activity type" },
      { status: 500 }
    );
  }
}
