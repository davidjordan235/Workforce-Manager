import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyPinSchema } from "@/types/time-clock";

// POST /api/tech-portal/verify-pin - Verify PIN for fallback auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = verifyPinSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const { enrollmentId, pin } = validationResult.data;

    // Find enrollment
    const enrollment = await prisma.techEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        agent: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (!enrollment.agent.isActive) {
      return NextResponse.json(
        { error: "Employee account is inactive" },
        { status: 403 }
      );
    }

    // Verify PIN
    const isValid = await bcrypt.compare(pin, enrollment.pin);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid PIN", verified: false },
        { status: 401 }
      );
    }

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("Error verifying PIN:", error);
    return NextResponse.json(
      { error: "Failed to verify PIN" },
      { status: 500 }
    );
  }
}
