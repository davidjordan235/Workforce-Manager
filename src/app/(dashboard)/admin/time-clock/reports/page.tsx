"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Download,
  Loader2,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useAdminPunches } from "@/hooks/useTimePunchAdmin";
import { useTechEnrollments } from "@/hooks/useTechEnrollment";
import { calculateEmployeeSummary, formatHoursDecimal, getWeekBounds } from "@/lib/hours-calculator";
import { generateSummaryReport, generateDetailedReport, downloadPDF } from "@/lib/pdf-generator";

type ReportFormat = "summary" | "detailed";

export default function ReportsPage() {
  // Default to current week
  const { start: weekStart, end: weekEnd } = getWeekBounds(new Date());

  const [startDate, setStartDate] = useState(weekStart.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(weekEnd.toISOString().split("T")[0]);
  const [selectedEnrollments, setSelectedEnrollments] = useState<string[]>([]);
  const [reportFormat, setReportFormat] = useState<ReportFormat>("summary");
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: enrollments } = useTechEnrollments();
  const { data: punchData, isLoading } = useAdminPunches({
    startDate,
    endDate,
    limit: 1000,
  });

  // Calculate summaries from punches
  const punches = punchData?.punches || [];
  const filteredPunches = selectedEnrollments.length > 0
    ? punches.filter((p) => selectedEnrollments.includes(p.enrollment.id))
    : punches;
  const summaries = calculateEmployeeSummary(filteredPunches);

  // Quick date range setters
  const setThisWeek = () => {
    const { start, end } = getWeekBounds(new Date());
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const setLastWeek = () => {
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const { start, end } = getWeekBounds(lastWeek);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  const handleGenerateReport = async () => {
    if (summaries.length === 0) {
      toast.error("No data to generate report");
      return;
    }

    setIsGenerating(true);

    try {
      const options = {
        startDate,
        endDate,
        companyName: "Workforce Manager",
      };

      const doc = reportFormat === "summary"
        ? generateSummaryReport(summaries, options)
        : generateDetailedReport(summaries, options);

      const filename = `payroll-${reportFormat}-${startDate}-to-${endDate}.pdf`;
      downloadPDF(doc, filename);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate totals
  const totalHours = summaries.reduce((sum, s) => sum + s.weeklyTotal, 0);
  const totalUnverified = summaries.reduce((sum, s) => sum + s.unverifiedCount, 0);
  const totalManual = summaries.reduce((sum, s) => sum + s.manualCount, 0);

  return (
    <div className="space-y-6">
      <Header
        title="Payroll Reports"
        description="Generate payroll reports for time tracking"
      />

      {/* Report Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Select the date range, employees, and report format
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex items-center gap-4">
              <div>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <span className="text-muted-foreground">to</span>
              <div>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2 ml-4">
                <Button variant="outline" size="sm" onClick={setThisWeek}>
                  This Week
                </Button>
                <Button variant="outline" size="sm" onClick={setLastWeek}>
                  Last Week
                </Button>
                <Button variant="outline" size="sm" onClick={setThisMonth}>
                  This Month
                </Button>
              </div>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Employees</Label>
            <Select
              value={selectedEnrollments.length === 0 ? "all" : "selected"}
              onValueChange={(value) => {
                if (value === "all") {
                  setSelectedEnrollments([]);
                }
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue>
                  {selectedEnrollments.length === 0
                    ? "All Employees"
                    : `${selectedEnrollments.length} Selected`}
                </SelectValue>
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
            <p className="text-xs text-muted-foreground">
              Leave as &quot;All Employees&quot; to include everyone with punches in the date range
            </p>
          </div>

          {/* Report Format */}
          <div className="space-y-2">
            <Label>Report Format</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="summary"
                  checked={reportFormat === "summary"}
                  onChange={() => setReportFormat("summary")}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Summary</p>
                  <p className="text-xs text-muted-foreground">
                    Daily hours per employee with weekly totals
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="format"
                  value="detailed"
                  checked={reportFormat === "detailed"}
                  onChange={() => setReportFormat("detailed")}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium">Detailed</p>
                  <p className="text-xs text-muted-foreground">
                    All punch times, verification status, and notes
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || isLoading || summaries.length === 0}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-5 w-5 mr-2" />
                  Download PDF Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Report Preview
          </CardTitle>
          <CardDescription>
            Preview of the data that will be included in the report
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Users className="h-4 w-4" />
                Employees
              </div>
              <p className="text-2xl font-bold mt-1">{summaries.length}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                Total Hours
              </div>
              <p className="text-2xl font-bold mt-1">{formatHoursDecimal(totalHours)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertTriangle className="h-4 w-4" />
                Unverified Punches
              </div>
              <p className="text-2xl font-bold mt-1">{totalUnverified}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Calendar className="h-4 w-4" />
                Manual Entries
              </div>
              <p className="text-2xl font-bold mt-1">{totalManual}</p>
            </div>
          </div>

          {/* Preview Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading data...
            </div>
          ) : summaries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No punch data found for the selected date range
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="text-right">Total Hours</TableHead>
                  <TableHead className="text-right">Days Worked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <TableRow key={summary.enrollmentId}>
                    <TableCell className="font-medium">
                      {summary.firstName} {summary.lastName}
                    </TableCell>
                    <TableCell>{summary.employeeId}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatHoursDecimal(summary.weeklyTotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {summary.dailyHours.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {summary.unverifiedCount > 0 && (
                          <Badge variant="secondary">
                            {summary.unverifiedCount} PIN
                          </Badge>
                        )}
                        {summary.manualCount > 0 && (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            {summary.manualCount} Manual
                          </Badge>
                        )}
                        {summary.unverifiedCount === 0 && summary.manualCount === 0 && (
                          <Badge variant="default" className="bg-green-500">
                            All Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
