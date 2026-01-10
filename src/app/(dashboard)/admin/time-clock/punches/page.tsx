"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  MapPin,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  LogOut,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useAdminPunches, useDeletePunch } from "@/hooks/useTimePunchAdmin";
import { useTechEnrollments } from "@/hooks/useTechEnrollment";
import { PunchEditDialog } from "@/components/features/time-punch/PunchEditDialog";
import { ManualPunchDialog } from "@/components/features/time-punch/ManualPunchDialog";
import { AdminTimePunchResponse, PunchType, VerificationMethod } from "@/types/time-clock";
import { formatTime, formatHoursDecimal } from "@/lib/hours-calculator";
import { getGoogleMapsLink } from "@/lib/geolocation";

type SortField = "employee" | "date";
type SortDirection = "asc" | "desc";

// Interface for punch with missing pair info
interface PunchWithStatus extends AdminTimePunchResponse {
  hasMissingPair: boolean;
}

export default function PunchesPage() {
  // Date range state - default to last 7 days
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [startDate, setStartDate] = useState(weekAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [showMissingOnly, setShowMissingOnly] = useState(false);

  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [editingPunch, setEditingPunch] = useState<AdminTimePunchResponse | null>(null);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: enrollments } = useTechEnrollments();
  const { data: punchData, isLoading, refetch } = useAdminPunches({
    startDate,
    endDate,
    enrollmentId: employeeFilter !== "all" ? employeeFilter : undefined,
    limit: 500,
    offset: 0,
  });
  const deleteMutation = useDeletePunch();

  // Process punches to detect missing pairs
  const punchesWithStatus: PunchWithStatus[] = useMemo(() => {
    const punches = punchData?.punches || [];
    if (punches.length === 0) return [];

    // Group punches by employee and date
    const groupedByEmployeeDate = new Map<string, AdminTimePunchResponse[]>();

    punches.forEach((punch) => {
      const date = new Date(punch.punchTime).toDateString();
      const key = `${punch.enrollment.id}-${date}`;
      if (!groupedByEmployeeDate.has(key)) {
        groupedByEmployeeDate.set(key, []);
      }
      groupedByEmployeeDate.get(key)!.push(punch);
    });

    // Check each punch for missing pair
    const result: PunchWithStatus[] = [];

    groupedByEmployeeDate.forEach((dayPunches) => {
      // Sort by time
      const sorted = [...dayPunches].sort(
        (a, b) => new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime()
      );

      // Count clock ins and clock outs
      const clockIns = sorted.filter((p) => p.punchType === PunchType.CLOCK_IN);
      const clockOuts = sorted.filter((p) => p.punchType === PunchType.CLOCK_OUT);

      // If counts don't match, there's a missing punch
      const hasMissingPunch = clockIns.length !== clockOuts.length;

      // Mark individual punches
      sorted.forEach((punch, index) => {
        let hasMissingPair = false;

        if (hasMissingPunch) {
          if (punch.punchType === PunchType.CLOCK_IN) {
            // Check if this clock in has a matching clock out after it
            const nextPunches = sorted.slice(index + 1);
            const nextClockOut = nextPunches.find(
              (p) => p.punchType === PunchType.CLOCK_OUT
            );
            // Check if there's already a clock in between this and the next clock out
            const nextClockIn = nextPunches.find(
              (p) => p.punchType === PunchType.CLOCK_IN
            );
            if (!nextClockOut || (nextClockIn && new Date(nextClockIn.punchTime) < new Date(nextClockOut.punchTime))) {
              hasMissingPair = true;
            }
          } else {
            // Clock out - check if there's a clock in before it
            const prevPunches = sorted.slice(0, index).reverse();
            const prevClockIn = prevPunches.find(
              (p) => p.punchType === PunchType.CLOCK_IN
            );
            const prevClockOut = prevPunches.find(
              (p) => p.punchType === PunchType.CLOCK_OUT
            );
            if (!prevClockIn || (prevClockOut && new Date(prevClockOut.punchTime) > new Date(prevClockIn.punchTime))) {
              hasMissingPair = true;
            }
          }
        }

        result.push({ ...punch, hasMissingPair });
      });
    });

    return result;
  }, [punchData?.punches]);

  // Sort and filter punches
  const sortedPunches = useMemo(() => {
    let filtered = showMissingOnly
      ? punchesWithStatus.filter((p) => p.hasMissingPair)
      : punchesWithStatus;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "employee":
          comparison = `${a.enrollment.agent.lastName} ${a.enrollment.agent.firstName}`.localeCompare(
            `${b.enrollment.agent.lastName} ${b.enrollment.agent.firstName}`
          );
          break;
        case "date":
          comparison = new Date(a.punchTime).getTime() - new Date(b.punchTime).getTime();
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [punchesWithStatus, sortField, sortDirection, showMissingOnly]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deleteMutation.mutateAsync(deleteId);
      toast.success("Punch deleted");
      setDeleteId(null);
      refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete punch");
    }
  };

  // Calculate stats
  const totalPunches = punchData?.total || 0;
  const unverifiedCount = punchesWithStatus.filter(
    (p) => p.verificationMethod === VerificationMethod.PIN_FALLBACK
  ).length;
  const manualCount = punchesWithStatus.filter((p) => p.isManual).length;
  const missingPairCount = punchesWithStatus.filter((p) => p.hasMissingPair).length;

  return (
    <div className="space-y-6">
      <Header
        title="Time Punch Management"
        description="View and manage employee time punches"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalPunches}</p>
                <p className="text-sm text-muted-foreground">Total Punches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer transition-colors ${showMissingOnly ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setShowMissingOnly(!showMissingOnly)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${missingPairCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
              <div>
                <p className={`text-2xl font-bold ${missingPairCount > 0 ? 'text-red-600' : ''}`}>
                  {missingPairCount}
                </p>
                <p className="text-sm text-muted-foreground">Missing Pairs</p>
              </div>
            </div>
            {missingPairCount > 0 && (
              <p className="text-xs text-red-600 mt-2">Click to filter</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{unverifiedCount}</p>
                <p className="text-sm text-muted-foreground">Unverified (PIN)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Pencil className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{manualCount}</p>
                <p className="text-sm text-muted-foreground">Manual Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {punchesWithStatus.filter((p) => p.verificationMethod === VerificationMethod.FACE_VERIFIED).length}
                </p>
                <p className="text-sm text-muted-foreground">Face Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-sm text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Employee</label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {enrollments?.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id}>
                      {enrollment.agent.firstName} {enrollment.agent.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {showMissingOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMissingOnly(false)}
                className="mt-5"
              >
                Clear Filter
              </Button>
            )}
          </div>
          <Button onClick={() => setManualDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Manual Punch
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading punches...
            </div>
          ) : sortedPunches.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {showMissingOnly
                ? "No punches with missing pairs found"
                : "No punches found for the selected date range"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("employee")}
                  >
                    <div className="flex items-center">
                      Employee
                      <SortIcon field="employee" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("date")}
                  >
                    <div className="flex items-center">
                      Date
                      <SortIcon field="date" />
                    </div>
                  </TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPunches.map((punch) => (
                  <TableRow
                    key={punch.id}
                    className={punch.hasMissingPair ? "bg-red-50 hover:bg-red-100" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {punch.hasMissingPair && (
                          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium">
                            {punch.enrollment.agent.firstName}{" "}
                            {punch.enrollment.agent.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {punch.enrollment.agent.employeeId}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(punch.punchTime).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatTime(punch.punchTime)}
                      {punch.originalPunchTime && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatTime(punch.originalPunchTime)}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {punch.punchType === PunchType.CLOCK_IN ? (
                        <Badge variant="default" className="bg-green-500">
                          <LogIn className="h-3 w-3 mr-1" />
                          In
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-red-500">
                          <LogOut className="h-3 w-3 mr-1" />
                          Out
                        </Badge>
                      )}
                      {punch.hasMissingPair && (
                        <Badge variant="destructive" className="ml-1">
                          Missing {punch.punchType === PunchType.CLOCK_IN ? "Out" : "In"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {punch.verificationMethod === VerificationMethod.FACE_VERIFIED ? (
                          <Badge variant="default" className="bg-green-500 w-fit">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="w-fit">
                            <XCircle className="h-3 w-3 mr-1" />
                            PIN
                          </Badge>
                        )}
                        {punch.isManual && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600 w-fit">
                            Manual
                          </Badge>
                        )}
                        {punch.editedAt && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600 w-fit">
                            Edited
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {punch.latitude && punch.longitude ? (
                        <a
                          href={getGoogleMapsLink(punch.latitude, punch.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                        >
                          <MapPin className="h-3 w-3" />
                          View
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {punch.manualNote && (
                        <span
                          className="text-xs text-muted-foreground truncate block max-w-[150px]"
                          title={punch.manualNote}
                        >
                          {punch.manualNote}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingPunch(punch)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Time
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(punch.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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

      {/* Edit Dialog */}
      <PunchEditDialog
        punch={editingPunch}
        open={!!editingPunch}
        onOpenChange={(open) => !open && setEditingPunch(null)}
        onSuccess={() => refetch()}
      />

      {/* Manual Punch Dialog */}
      <ManualPunchDialog
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Punch</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this punch? This action cannot be undone.
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
