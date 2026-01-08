import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listPunchesSchema, AdminTimePunchResponse } from "@/types/time-clock";

// GET /api/time-punch - List punches with filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and SUPERVISOR can view all punches
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const params = {
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      enrollmentId: searchParams.get("enrollmentId") || undefined,
      employeeId: searchParams.get("employeeId") || undefined,
      punchType: searchParams.get("punchType") || undefined,
      verificationMethod: searchParams.get("verificationMethod") || undefined,
      limit: searchParams.get("limit") || undefined,
      offset: searchParams.get("offset") || undefined,
    };

    const validated = listPunchesSchema.parse(params);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (validated.enrollmentId) {
      where.enrollmentId = validated.enrollmentId;
    }

    if (validated.employeeId) {
      where.enrollment = {
        agent: {
          employeeId: validated.employeeId,
        },
      };
    }

    if (validated.punchType) {
      where.punchType = validated.punchType;
    }

    if (validated.verificationMethod) {
      where.verificationMethod = validated.verificationMethod;
    }

    // Date range filter
    if (validated.startDate || validated.endDate) {
      where.punchTime = {};
      if (validated.startDate) {
        (where.punchTime as Record<string, unknown>).gte = new Date(validated.startDate);
      }
      if (validated.endDate) {
        // End of day for end date
        const endDate = new Date(validated.endDate);
        endDate.setHours(23, 59, 59, 999);
        (where.punchTime as Record<string, unknown>).lte = endDate;
      }
    }

    // Fetch punches
    const [punches, total] = await Promise.all([
      prisma.timePunch.findMany({
        where,
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
        orderBy: { punchTime: "desc" },
        take: validated.limit,
        skip: validated.offset,
      }),
      prisma.timePunch.count({ where }),
    ]);

    // Transform to response format
    const response: AdminTimePunchResponse[] = punches.map((punch) => ({
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
    }));

    return NextResponse.json({
      punches: response,
      total,
      limit: validated.limit,
      offset: validated.offset,
    });
  } catch (error) {
    console.error("Error fetching punches:", error);
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to fetch punches" }, { status: 500 });
  }
}
