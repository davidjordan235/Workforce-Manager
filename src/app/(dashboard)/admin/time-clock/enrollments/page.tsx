"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Camera,
  MapPin,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useTechEnrollments, useDeleteTechEnrollment } from "@/hooks/useTechEnrollment";
import { EnrollmentWizard } from "@/components/features/tech-enrollment/EnrollmentWizard";
import { formatCoordinates, getGoogleMapsLink } from "@/lib/geolocation";

export default function EnrollmentsPage() {
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: enrollments, isLoading, refetch } = useTechEnrollments(search);
  const deleteEnrollment = useDeleteTechEnrollment();

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteEnrollment.mutateAsync(deleteId);
      toast.success("Enrollment deleted");
      setDeleteId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete enrollment");
    }
  };

  return (
    <div className="space-y-6">
      <Header
        title="Time Clock Enrollments"
        description="Manage employee time clock enrollments"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search enrollments..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Enroll Employee
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading enrollments...
            </div>
          ) : !enrollments?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              {search ? "No enrollments found" : "No employees enrolled yet"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Photo</TableHead>
                  <TableHead>Enrollment Location</TableHead>
                  <TableHead>Enrolled By</TableHead>
                  <TableHead>Enrolled At</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {enrollment.referencePhotoUrl ? (
                          <img
                            src={enrollment.referencePhotoUrl}
                            alt={`${enrollment.agent.firstName} ${enrollment.agent.lastName}`}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-slate-600">
                              {enrollment.agent.firstName[0]}
                              {enrollment.agent.lastName[0]}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">
                            {enrollment.agent.firstName} {enrollment.agent.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {enrollment.agent.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {enrollment.agent.employeeId}
                      </code>
                    </TableCell>
                    <TableCell>
                      {enrollment.hasFaceDescriptor ? (
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Enrolled
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" />
                          PIN Only
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {enrollment.enrollmentLat && enrollment.enrollmentLng ? (
                        <a
                          href={getGoogleMapsLink(
                            enrollment.enrollmentLat,
                            enrollment.enrollmentLng
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <MapPin className="h-3 w-3" />
                          {formatCoordinates(
                            enrollment.enrollmentLat,
                            enrollment.enrollmentLng
                          )}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          Not recorded
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{enrollment.enrolledBy.name}</TableCell>
                    <TableCell>
                      {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(enrollment.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Enrollment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Wizard */}
      <EnrollmentWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Enrollment</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the employee from the time clock system. All punch
              records will be deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
