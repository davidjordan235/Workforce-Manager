import { z } from "zod";

// ============================================
// DEPARTMENT TYPES
// ============================================

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

export interface DepartmentResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EMPLOYMENT TYPE TYPES
// ============================================

export const employmentTypeSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().optional(),
});

export type EmploymentTypeInput = z.infer<typeof employmentTypeSchema>;

export interface EmploymentTypeResponse {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// EMERGENCY CONTACT TYPES
// ============================================

export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(1, "Phone is required").max(20),
  relationship: z.string().min(1, "Relationship is required").max(50),
});

export type EmergencyContact = z.infer<typeof emergencyContactSchema>;

// ============================================
// EXTENDED EMPLOYEE TYPES
// ============================================

export const employeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required").max(20),
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(20).optional().nullable(),
  hireDate: z.string().or(z.date()),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color").optional().nullable(),

  // New fields
  title: z.string().max(100).optional().nullable(),
  dateOfBirth: z.string().or(z.date()).optional().nullable(),
  departmentId: z.string().cuid().optional().nullable(),
  employmentTypeId: z.string().cuid().optional().nullable(),
  reportsToId: z.string().cuid().optional().nullable(),
  emergencyContact: emergencyContactSchema.optional().nullable(),
  isActive: z.boolean().optional(),

  // Photo enrollment (optional during creation)
  enrollWithPhoto: z.boolean().optional(),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits").optional(),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;

export interface EmployeeResponse {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  hireDate: string;
  isActive: boolean;
  displayOrder: number;
  color: string | null;
  title: string | null;
  dateOfBirth: string | null;
  emergencyContact: EmergencyContact | null;
  department: DepartmentResponse | null;
  employmentType: EmploymentTypeResponse | null;
  reportsTo: { id: string; firstName: string; lastName: string } | null;
  techEnrollment: {
    id: string;
    referencePhotoUrl: string | null;
    hasFaceDescriptor: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}
