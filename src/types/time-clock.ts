import { z } from "zod";

// ============================================
// ENUMS (matching Prisma schema)
// ============================================

export const PunchType = {
  CLOCK_IN: "CLOCK_IN",
  CLOCK_OUT: "CLOCK_OUT",
} as const;

export type PunchType = (typeof PunchType)[keyof typeof PunchType];

export const VerificationMethod = {
  FACE_VERIFIED: "FACE_VERIFIED",
  PIN_FALLBACK: "PIN_FALLBACK",
} as const;

export type VerificationMethod = (typeof VerificationMethod)[keyof typeof VerificationMethod];

// ============================================
// ZOD SCHEMAS
// ============================================

// PIN validation (4-6 digits)
export const pinSchema = z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits");

// Face descriptor (128-dimension array from face-api.js)
export const faceDescriptorSchema = z.array(z.number()).length(128);

// Geolocation data
export const geolocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().positive().optional(),
  address: z.string().optional(),
});

export type GeolocationData = z.infer<typeof geolocationSchema>;

// Tech enrollment creation
export const createEnrollmentSchema = z.object({
  agentId: z.string().cuid(),
  pin: pinSchema,
  referencePhotoUrl: z.string().optional(),
  faceDescriptor: faceDescriptorSchema.optional(),
  enrollmentLat: z.number().optional(),
  enrollmentLng: z.number().optional(),
  enrollmentAddress: z.string().optional(),
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;

// Tech enrollment update
export const updateEnrollmentSchema = z.object({
  pin: pinSchema.optional(),
  referencePhotoUrl: z.string().optional(),
  faceDescriptor: faceDescriptorSchema.optional(),
});

export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;

// Identify tech by employee ID
export const identifyTechSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
});

export type IdentifyTechInput = z.infer<typeof identifyTechSchema>;

// Verify PIN
export const verifyPinSchema = z.object({
  enrollmentId: z.string().cuid(),
  pin: z.string().min(4).max(6),
});

export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

// Record punch
export const recordPunchSchema = z.object({
  enrollmentId: z.string().cuid(),
  punchType: z.enum([PunchType.CLOCK_IN, PunchType.CLOCK_OUT]),
  verificationMethod: z.enum([VerificationMethod.FACE_VERIFIED, VerificationMethod.PIN_FALLBACK]),
  faceConfidence: z.number().min(0).max(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
  address: z.string().optional(),
});

export type RecordPunchInput = z.infer<typeof recordPunchSchema>;

// Photo upload
export const uploadPhotoSchema = z.object({
  imageData: z.string(), // Base64 encoded image
  faceDescriptor: faceDescriptorSchema,
});

export type UploadPhotoInput = z.infer<typeof uploadPhotoSchema>;

// ============================================
// RESPONSE TYPES
// ============================================

export interface TechEnrollmentResponse {
  id: string;
  agentId: string;
  agent: {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  referencePhotoUrl: string | null;
  hasFaceDescriptor: boolean;
  enrollmentLat: number | null;
  enrollmentLng: number | null;
  enrollmentAddress: string | null;
  enrolledAt: string;
  enrolledBy: {
    id: string;
    name: string;
  };
}

export interface TimePunchResponse {
  id: string;
  punchType: PunchType;
  punchTime: string;
  verificationMethod: VerificationMethod;
  faceConfidence: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  enrollment: {
    agent: {
      firstName: string;
      lastName: string;
      employeeId: string;
    };
  };
}

export interface TechStatusResponse {
  enrollment: TechEnrollmentResponse;
  lastPunch: TimePunchResponse | null;
  currentStatus: "clocked_in" | "clocked_out";
}

// ============================================
// FACE RECOGNITION TYPES
// ============================================

export interface FaceDetectionResult {
  detected: boolean;
  descriptor: number[] | null;
  confidence: number;
  error?: string;
}

export interface FaceComparisonResult {
  matched: boolean;
  distance: number;
  confidence: number;
}

// Face matching thresholds
export const FACE_MATCH_THRESHOLD = 0.6; // Euclidean distance threshold
export const FACE_CONFIDENCE_HIGH = 0.5; // Below this = high confidence match
export const FACE_CONFIDENCE_MEDIUM = 0.6; // Below this = acceptable match

// ============================================
// ADMIN PUNCH MANAGEMENT
// ============================================

// Query params for listing punches
export const listPunchesSchema = z.object({
  startDate: z.string().optional(), // ISO date string
  endDate: z.string().optional(),
  enrollmentId: z.string().cuid().optional(),
  employeeId: z.string().optional(),
  punchType: z.enum([PunchType.CLOCK_IN, PunchType.CLOCK_OUT]).optional(),
  verificationMethod: z.enum([VerificationMethod.FACE_VERIFIED, VerificationMethod.PIN_FALLBACK]).optional(),
  limit: z.coerce.number().min(1).max(2000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type ListPunchesInput = z.infer<typeof listPunchesSchema>;

// Update punch time
export const updatePunchSchema = z.object({
  punchTime: z.string().datetime(), // ISO datetime
  note: z.string().min(1, "A note explaining the edit is required"),
});

export type UpdatePunchInput = z.infer<typeof updatePunchSchema>;

// Manual punch entry
export const manualPunchSchema = z.object({
  enrollmentId: z.string().cuid(),
  punchType: z.enum([PunchType.CLOCK_IN, PunchType.CLOCK_OUT]),
  punchTime: z.string().datetime(), // ISO datetime
  note: z.string().min(1, "A note explaining the manual entry is required"),
});

export type ManualPunchInput = z.infer<typeof manualPunchSchema>;

// Extended punch response for admin view
export interface AdminTimePunchResponse {
  id: string;
  punchType: PunchType;
  punchTime: string;
  verificationMethod: VerificationMethod;
  faceConfidence: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string | null;
  isManual: boolean;
  manualNote: string | null;
  editedAt: string | null;
  editedBy: { id: string; name: string } | null;
  originalPunchTime: string | null;
  createdAt: string;
  enrollment: {
    id: string;
    agent: {
      id: string;
      employeeId: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

// Hours calculation types
export interface PunchPair {
  clockIn: AdminTimePunchResponse;
  clockOut: AdminTimePunchResponse | null;
  hours: number | null; // null if clock out is missing
  isComplete: boolean;
}

export interface DailyHours {
  date: string; // ISO date string
  pairs: PunchPair[];
  totalHours: number;
  hasIncomplete: boolean;
}

export interface EmployeeHoursSummary {
  enrollmentId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  dailyHours: DailyHours[];
  weeklyTotal: number;
  unverifiedCount: number;
  manualCount: number;
}

// Payroll report request
export const payrollReportSchema = z.object({
  startDate: z.string(), // ISO date
  endDate: z.string(), // ISO date
  enrollmentIds: z.array(z.string().cuid()).optional(), // Empty = all employees
  format: z.enum(["summary", "detailed"]),
});

export type PayrollReportInput = z.infer<typeof payrollReportSchema>;
