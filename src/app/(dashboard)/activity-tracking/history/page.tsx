"use client";

import { useState, useMemo } from "react";
import { format, parseISO, startOfWeek, endOfWeek, subWeeks } from "date-fns";
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
import { Clock, Loader2, Download, Filter, Calendar } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";
import { useActivityLogs } from "@/hooks/useActivityLogs";
import { ACTIVITY_CATEGORIES } from "@/types/activity-log";

export default function ActivityHistoryPage() {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 0 });

  const [selectedAgentId, setSelectedAgentId] = useState<string>("all");
  const [startDate, setStartDate] = useState(format(weekStart, "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(weekEnd, "yyyy-MM-dd"));
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: activityLogs, isLoading: logsLoading } = useActivityLogs({
    agentId: selectedAgentId === "all" ? undefined : selectedAgentId,
    startDate,
    endDate,
    category: selectedCategory === "all" ? undefined : selectedCategory,
  });

  // Group logs by date
  const groupedLogs = useMemo(() => {
    if (!activityLogs) return {};
    const groups: Record<string, typeof activityLogs> = {};

    for (const log of activityLogs) {
      const dateKey = log.date;
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(log);
    }

    // Sort entries within each date by start time
    for (const date of Object.keys(groups)) {
      groups[date].sort((a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
    }

    return groups;
  }, [activityLogs]);

  // Calculate totals
  const totalMinutes = useMemo(() => {
    if (!activityLogs) return 0;
    return activityLogs.reduce((total, log) => {
      const start = new Date(log.startTime);
      const end = new Date(log.endTime);
      return total + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);
  }, [activityLogs]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const setQuickDateRange = (range: "thisWeek" | "lastWeek" | "thisMonth") => {
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
    }
  };

  const exportToCSV = () => {
    if (!activityLogs || activityLogs.length === 0) return;

    const headers = ["Date", "Employee", "Start Time", "End Time", "Duration", "Description", "Category", "Notes"];
    const rows = activityLogs.map((log) => {
      const start = new Date(log.startTime);
      const end = new Date(log.endTime);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      return [
        log.date,
        `${log.agent?.firstName ?? ""} ${log.agent?.lastName ?? ""}`,
        format(start, "h:mm a"),
        format(end, "h:mm a"),
        formatDuration(duration),
        log.description,
        log.category || "",
        log.notes || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-history-${startDate}-to-${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity History" />

      <div className="flex-1 p-6 overflow-auto">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {agents?.map((agent) => (
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

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              </div>

              <div className="flex-1" />

              <Button
                variant="outline"
                onClick={exportToCSV}
                disabled={!activityLogs || activityLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-sm text-muted-foreground">Total Time</p>
                <p className="text-2xl font-bold">{formatDuration(totalMinutes)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activities</p>
                <p className="text-2xl font-bold">{activityLogs?.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Days</p>
                <p className="text-2xl font-bold">{Object.keys(groupedLogs).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity List */}
        {logsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !activityLogs || activityLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No activities found for the selected filters.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedLogs)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, logs]) => {
                const dayMinutes = logs.reduce((total, log) => {
                  const start = new Date(log.startTime);
                  const end = new Date(log.endTime);
                  return total + (end.getTime() - start.getTime()) / (1000 * 60);
                }, 0);

                return (
                  <Card key={date}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                        </CardTitle>
                        <span className="text-sm text-muted-foreground">
                          {logs.length} activities | {formatDuration(dayMinutes)}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {selectedAgentId === "all" && <TableHead className="w-[150px]">Employee</TableHead>}
                            <TableHead className="w-[100px]">Time</TableHead>
                            <TableHead className="w-[80px]">Duration</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="w-[120px]">Category</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {logs.map((log) => {
                            const start = new Date(log.startTime);
                            const end = new Date(log.endTime);
                            const duration = (end.getTime() - start.getTime()) / (1000 * 60);

                            return (
                              <TableRow key={log.id}>
                                {selectedAgentId === "all" && (
                                  <TableCell className="font-medium">
                                    {log.agent?.firstName} {log.agent?.lastName}
                                  </TableCell>
                                )}
                                <TableCell className="text-sm">
                                  {format(start, "h:mm a")} - {format(end, "h:mm a")}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDuration(duration)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{log.description}</p>
                                    {log.notes && (
                                      <p className="text-sm text-muted-foreground">{log.notes}</p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {log.category && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                      {log.category}
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
