"use client";

import { useState, useMemo } from "react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BarChart3,
  Clock,
  Loader2,
  Download,
  Users,
  TrendingUp,
} from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { useDepartments } from "@/hooks/useDepartments";
import { useActivityLogReport } from "@/hooks/useActivityLogs";

export default function ActivityReportsPage() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const [startDate, setStartDate] = useState(format(weekStart, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(weekEnd, "yyyy-MM-dd"));
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");

  const { data: agents } = useAgents();
  const { data: departments } = useDepartments();
  const { data: report, isLoading: reportLoading } = useActivityLogReport({
    startDate,
    endDate,
    departmentId: selectedDepartmentId === "all" ? undefined : selectedDepartmentId,
    agentId: selectedAgentId === "all" ? undefined : selectedAgentId,
  });

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatHours = (minutes: number) => {
    return (minutes / 60).toFixed(1);
  };

  const setQuickDateRange = (range: "thisWeek" | "lastWeek" | "thisMonth" | "last30Days") => {
    const now = new Date();
    switch (range) {
      case "thisWeek":
        setStartDate(format(startOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"));
        setEndDate(format(endOfWeek(now, { weekStartsOn: 0 }), "yyyy-MM-dd"));
        break;
      case "lastWeek":
        const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 1);
        const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 0 }), 1);
        setStartDate(format(lastWeekStart, "yyyy-MM-dd"));
        setEndDate(format(lastWeekEnd, "yyyy-MM-dd"));
        break;
      case "thisMonth":
        setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd"));
        setEndDate(format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "yyyy-MM-dd"));
        break;
      case "last30Days":
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        setStartDate(format(thirtyDaysAgo, "yyyy-MM-dd"));
        setEndDate(format(now, "yyyy-MM-dd"));
        break;
    }
  };

  // Calculate category totals across all employees
  const categoryTotals = useMemo(() => {
    if (!report?.summaries) return {};
    const totals: Record<string, number> = {};
    for (const summary of report.summaries) {
      for (const [category, minutes] of Object.entries(summary.byCategory)) {
        totals[category] = (totals[category] || 0) + minutes;
      }
    }
    return totals;
  }, [report]);

  const sortedCategories = useMemo(() => {
    return Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  }, [categoryTotals]);

  const exportToCSV = () => {
    if (!report || report.summaries.length === 0) return;

    const headers = ["Employee", "Department", "Total Hours", "Activities", ...Object.keys(categoryTotals).map(cat => `${cat} (hrs)`)];
    const rows = report.summaries.map((summary) => {
      const baseRow = [
        summary.agentName,
        summary.department || "N/A",
        formatHours(summary.totalMinutes),
        summary.entries.toString(),
      ];
      const categoryHours = Object.keys(categoryTotals).map(cat =>
        formatHours(summary.byCategory[cat] || 0)
      );
      return [...baseRow, ...categoryHours];
    });

    // Add totals row
    const totalRow = [
      "TOTAL",
      "",
      formatHours(report.totalMinutes),
      report.totalEntries.toString(),
      ...Object.keys(categoryTotals).map(cat => formatHours(categoryTotals[cat])),
    ];
    rows.push(totalRow);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-report-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter agents by department if selected
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    if (selectedDepartmentId === "all") return agents;
    return agents.filter((a) => a.departmentId === selectedDepartmentId);
  }, [agents, selectedDepartmentId]);

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity Reports" />

      <div className="flex-1 p-6 overflow-auto">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Report Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Select
                  value={selectedDepartmentId}
                  onValueChange={(val) => {
                    setSelectedDepartmentId(val);
                    setSelectedAgentId("all");
                  }}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {filteredAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.firstName} {agent.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-[160px]"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange("thisWeek")}
                >
                  This Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange("lastWeek")}
                >
                  Last Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange("thisMonth")}
                >
                  This Month
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickDateRange("last30Days")}
                >
                  Last 30 Days
                </Button>
              </div>

              <div className="flex-1" />

              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={!report || report.summaries.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {reportLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !report || report.summaries.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No activity data found for the selected parameters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Hours</p>
                      <p className="text-2xl font-bold">{formatHours(report.totalMinutes)}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Activities</p>
                      <p className="text-2xl font-bold">{report.totalEntries}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employees</p>
                      <p className="text-2xl font-bold">{report.summaries.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg per Employee</p>
                      <p className="text-2xl font-bold">
                        {formatHours(report.totalMinutes / report.summaries.length)}h
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Employee Summary Table */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Employee Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                        <TableHead className="text-right">Activities</TableHead>
                        <TableHead className="text-right">Avg/Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.summaries.map((summary) => (
                        <TableRow key={summary.agentId}>
                          <TableCell className="font-medium">{summary.agentName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {summary.department || "N/A"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatHours(summary.totalMinutes)}h
                          </TableCell>
                          <TableCell className="text-right">{summary.entries}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatDuration(summary.totalMinutes / summary.entries)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Time by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {sortedCategories.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No categories recorded</p>
                  ) : (
                    <div className="space-y-4">
                      {sortedCategories.map(([category, minutes]) => {
                        const percentage = (minutes / report.totalMinutes) * 100;
                        return (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">{category}</span>
                              <span className="text-muted-foreground">
                                {formatHours(minutes)}h ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Category Breakdown per Employee */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Detailed Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-white">Employee</TableHead>
                        {Object.keys(categoryTotals).map((cat) => (
                          <TableHead key={cat} className="text-right min-w-[100px]">
                            {cat}
                          </TableHead>
                        ))}
                        <TableHead className="text-right font-bold">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.summaries.map((summary) => (
                        <TableRow key={summary.agentId}>
                          <TableCell className="sticky left-0 bg-white font-medium">
                            {summary.agentName}
                          </TableCell>
                          {Object.keys(categoryTotals).map((cat) => (
                            <TableCell key={cat} className="text-right">
                              {summary.byCategory[cat]
                                ? `${formatHours(summary.byCategory[cat])}h`
                                : "-"}
                            </TableCell>
                          ))}
                          <TableCell className="text-right font-bold">
                            {formatHours(summary.totalMinutes)}h
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-gray-50 font-bold">
                        <TableCell className="sticky left-0 bg-gray-50">Total</TableCell>
                        {Object.keys(categoryTotals).map((cat) => (
                          <TableCell key={cat} className="text-right">
                            {formatHours(categoryTotals[cat])}h
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          {formatHours(report.totalMinutes)}h
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
