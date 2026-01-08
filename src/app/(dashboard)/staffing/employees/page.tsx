"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Users,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Search,
  Camera,
  Mail,
  Phone,
  Calendar,
  Building2,
  Briefcase,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAgents,
  useCreateAgent,
  useUpdateAgent,
  useDeleteAgent,
} from "@/hooks/useAgents";
import { useCreateTechEnrollment, useUploadTechPhoto, useDeleteTechPhoto } from "@/hooks/useTechEnrollment";
import { EmployeeForm } from "@/components/features/staffing/EmployeeForm";
import bcrypt from "bcryptjs";

interface ExtendedAgent {
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
  emergencyContact: { name: string; phone: string; relationship: string } | null;
  department: { id: string; name: string } | null;
  employmentType: { id: string; name: string } | null;
  reportsTo: { id: string; firstName: string; lastName: string } | null;
  techEnrollment: {
    id: string;
    referencePhotoUrl: string | null;
    hasFaceDescriptor: boolean;
  } | null;
}

export default function EmployeesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<ExtendedAgent | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<ExtendedAgent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: employees, isLoading, error } = useAgents(searchQuery);
  const createMutation = useCreateAgent();
  const updateMutation = useUpdateAgent();
  const deleteMutation = useDeleteAgent();
  const createEnrollmentMutation = useCreateTechEnrollment();
  const uploadPhotoMutation = useUploadTechPhoto();
  const deletePhotoMutation = useDeleteTechPhoto();

  const handleDeletePhoto = async (enrollmentId: string) => {
    try {
      await deletePhotoMutation.mutateAsync(enrollmentId);
      toast.success("Photo deleted successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete photo");
      throw error;
    }
  };

  const handleOpenForm = (employee?: ExtendedAgent) => {
    if (employee) {
      setEditingEmployee(employee);
    } else {
      setEditingEmployee(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (data: {
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    hireDate: string;
    color: string;
    title: string;
    dateOfBirth: string;
    departmentId: string | null;
    employmentTypeId: string | null;
    reportsToId: string | null;
    isActive: boolean;
    emergencyContact: { name: string; phone: string; relationship: string } | null;
    enrollWithPhoto: boolean;
    pin: string;
    capturedPhoto: string | null;
    faceDescriptor: number[] | null;
  }) => {
    try {
      let agentId: string;

      if (editingEmployee) {
        // Update existing employee
        const updated = await updateMutation.mutateAsync({
          id: editingEmployee.id,
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone || null,
            hireDate: data.hireDate,
            color: data.color,
            title: data.title || null,
            dateOfBirth: data.dateOfBirth || null,
            departmentId: data.departmentId,
            employmentTypeId: data.employmentTypeId,
            reportsToId: data.reportsToId,
            isActive: data.isActive,
            emergencyContact: data.emergencyContact,
          },
        });
        agentId = updated.id;
        toast.success("Employee updated successfully");
      } else {
        // Create new employee
        const created = await createMutation.mutateAsync({
          employeeId: data.employeeId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone || null,
          hireDate: data.hireDate,
          color: data.color,
          title: data.title || null,
          dateOfBirth: data.dateOfBirth || null,
          departmentId: data.departmentId,
          employmentTypeId: data.employmentTypeId,
          reportsToId: data.reportsToId,
          emergencyContact: data.emergencyContact,
        });
        agentId = created.id;
        toast.success("Employee created successfully");
      }

      // Handle photo enrollment if enabled
      if (data.enrollWithPhoto && data.pin) {
        try {
          // Check if employee already has an enrollment (when editing)
          const existingEnrollment = editingEmployee?.techEnrollment;

          if (existingEnrollment) {
            // Employee already enrolled - just update the photo if provided
            if (data.capturedPhoto && data.faceDescriptor) {
              await uploadPhotoMutation.mutateAsync({
                id: existingEnrollment.id,
                data: {
                  imageData: data.capturedPhoto,
                  faceDescriptor: data.faceDescriptor,
                },
              });
              toast.success("Photo updated successfully");
            }
          } else {
            // Create new enrollment
            const enrollment = await createEnrollmentMutation.mutateAsync({
              agentId,
              pin: data.pin,
            });

            if (data.capturedPhoto && data.faceDescriptor) {
              await uploadPhotoMutation.mutateAsync({
                id: enrollment.id,
                data: {
                  imageData: data.capturedPhoto,
                  faceDescriptor: data.faceDescriptor,
                },
              });
            }

            toast.success("Photo enrollment completed");
          }
        } catch (enrollError) {
          console.error("Enrollment error:", enrollError);
          toast.error("Employee saved but enrollment failed. You can enroll later.");
        }
      }

      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save employee");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingEmployee) return;
    try {
      await deleteMutation.mutateAsync(deletingEmployee.id);
      toast.success("Employee deleted successfully");
      setDeletingEmployee(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete employee");
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Employees" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Employee Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage employee profiles and enrollment
            </p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-red-500">
                Failed to load employees. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Employees ({employees?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employees && employees.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(employees as ExtendedAgent[]).map((employee) => (
                    <div
                      key={employee.id}
                      className={`relative p-4 rounded-lg border ${
                        !employee.isActive ? "bg-muted/50 opacity-75" : ""
                      }`}
                    >
                      <div className="absolute top-2 right-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenForm(employee)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingEmployee(employee)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-start gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg flex-shrink-0"
                          style={{ backgroundColor: employee.color || "#6366f1" }}
                        >
                          {employee.techEnrollment?.referencePhotoUrl ? (
                            <img
                              src={employee.techEnrollment.referencePhotoUrl}
                              alt=""
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            getInitials(employee.firstName, employee.lastName)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {employee.firstName} {employee.lastName}
                            </span>
                            {!employee.isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {employee.title || employee.employeeId}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        {employee.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        {employee.department && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{employee.department.name}</span>
                          </div>
                        )}
                        {employee.employmentType && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase className="h-3 w-3" />
                            <span>{employee.employmentType.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {employee.techEnrollment ? (
                          <Badge variant="default" className="text-xs">
                            <Camera className="h-3 w-3 mr-1" />
                            Enrolled
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Not Enrolled
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No employees found. Add one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Employee Form */}
      <EmployeeForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        onSubmit={handleSubmit}
        initialData={
          editingEmployee
            ? {
                employeeId: editingEmployee.employeeId,
                firstName: editingEmployee.firstName,
                lastName: editingEmployee.lastName,
                email: editingEmployee.email,
                phone: editingEmployee.phone || "",
                hireDate: editingEmployee.hireDate.split("T")[0],
                color: editingEmployee.color || "#6366f1",
                title: editingEmployee.title || "",
                dateOfBirth: editingEmployee.dateOfBirth?.split("T")[0] || "",
                departmentId: editingEmployee.department?.id || null,
                employmentTypeId: editingEmployee.employmentType?.id || null,
                reportsToId: editingEmployee.reportsTo?.id || null,
                isActive: editingEmployee.isActive,
                emergencyContact: editingEmployee.emergencyContact,
                enrollWithPhoto: !!editingEmployee.techEnrollment,
                pin: "",
                confirmPin: "",
                capturedPhoto: null,
                faceDescriptor: null,
                existingPhotoUrl: editingEmployee.techEnrollment?.referencePhotoUrl || null,
              }
            : undefined
        }
        isLoading={createMutation.isPending || updateMutation.isPending}
        editingId={editingEmployee?.id}
        enrollmentId={editingEmployee?.techEnrollment?.id}
        onDeletePhoto={handleDeletePhoto}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingEmployee}
        onOpenChange={(open) => !open && setDeletingEmployee(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingEmployee?.firstName}{" "}
              {deletingEmployee?.lastName}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingEmployee(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
