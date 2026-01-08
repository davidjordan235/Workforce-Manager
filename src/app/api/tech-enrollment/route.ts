import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { createEnrollmentSchema } from "@/types/time-clock";

// GET /api/tech-enrollment - List all enrolled techs
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and SUPERVISOR can view enrollments
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search");

    const enrollments = await prisma.techEnrollment.findMany({
      where: search
        ? {
            agent: {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { employeeId: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : undefined,
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
      },
      orderBy: {
        enrolledAt: "desc",
      },
    });

    // Transform to hide sensitive data
    const response = enrollments.map((enrollment) => ({
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
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching enrollments:", error);
    return NextResponse.json(
      { error: "Failed to fetch enrollments" },
      { status: 500 }
    );
  }
}

// POST /api/tech-enrollment - Create new enrollment
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only ADMIN and SUPERVISOR can create enrollments
    if (session.user.role !== "ADMIN" && session.user.role !== "SUPERVISOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = createEnrollmentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // Check if agent exists
    const agent = await prisma.agent.findUnique({
      where: { id: data.agentId },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Check if agent is already enrolled
    const existingEnrollment = await prisma.techEnrollment.findUnique({
      where: { agentId: data.agentId },
    });
    if (existingEnrollment) {
      return NextResponse.json(
        { error: "Agent is already enrolled in time clock system" },
        { status: 409 }
      );
    }

    // Hash the PIN
    const hashedPin = await bcrypt.hash(data.pin, 10);

    // Create enrollment
    const enrollment = await prisma.techEnrollment.create({
      data: {
        agentId: data.agentId,
        pin: hashedPin,
        referencePhotoUrl: data.referencePhotoUrl,
        faceDescriptor: data.faceDescriptor,
        enrollmentLat: data.enrollmentLat,
        enrollmentLng: data.enrollmentLng,
        enrollmentAddress: data.enrollmentAddress,
        enrolledById: session.user.id,
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

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating enrollment:", error);
    return NextResponse.json(
      { error: "Failed to create enrollment" },
      { status: 500 }
    );
  }
}
