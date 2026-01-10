"use client";

import { useState, useMemo } from "react";
import { useClockStatus, ClockStatusEntry } from "@/hooks/useClockStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, Search } from "lucide-react";

function formatClockInTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface EmployeeRowProps {
  agentId: string;
  entry: ClockStatusEntry;
}

function EmployeeRow({ agentId, entry }: EmployeeRowProps) {
  const initials = `${entry.firstName[0]}${entry.lastName[0]}`.toUpperCase();

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-2 px-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: entry.color || "#4CAF50" }}
          >
            {initials}
          </div>
          <span className="text-sm font-medium">
            {entry.firstName} {entry.lastName}
          </span>
        </div>
      </td>
      <td className="py-2 px-3">
        <Badge
          variant={entry.isClockedIn ? "default" : "secondary"}
          className={entry.isClockedIn ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
        >
          {entry.isClockedIn ? "WORKING" : "OUT"}
        </Badge>
      </td>
      <td className="py-2 px-3 text-sm text-gray-600">
        {entry.lastPunchTime ? formatClockInTime(entry.lastPunchTime) : "-"}
      </td>
    </tr>
  );
}

export function EmployeeStatusTile() {
  const { data: clockStatus, isLoading, error } = useClockStatus();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Extract unique departments from the data
  const departments = useMemo(() => {
    if (!clockStatus) return [];

    const deptMap = new Map<string, string>();
    Object.values(clockStatus).forEach((entry) => {
      if (entry.departmentId && entry.departmentName) {
        deptMap.set(entry.departmentId, entry.departmentName);
      }
    });

    return Array.from(deptMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [clockStatus]);

  // Convert to array and filter
  const employees = useMemo(() => {
    if (!clockStatus) return [];

    return Object.entries(clockStatus)
      .map(([agentId, entry]) => ({ agentId, ...entry }))
      .filter(emp => {
        // Filter by department
        if (selectedDepartment !== "all" && emp.departmentId !== selectedDepartment) {
          return false;
        }
        // Filter by search query
        if (!searchQuery) return true;
        const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => {
        // Sort by clocked in first, then by name
        if (a.isClockedIn !== b.isClockedIn) {
          return a.isClockedIn ? -1 : 1;
        }
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      });
  }, [clockStatus, searchQuery, selectedDepartment]);

  const clockedInCount = employees.filter(e => e.isClockedIn).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-5 w-5 text-blue-500" />
            Employee Status
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            <span>{clockedInCount}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Filters */}
        <div className="flex gap-2 mb-3">
          {/* Department Filter */}
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Failed to load employee status
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees found
          </div>
        ) : (
          <ScrollArea className="h-[350px]">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-xs text-gray-500 uppercase">
                  <th className="py-2 px-3 font-medium">Name</th>
                  <th className="py-2 px-3 font-medium">Status</th>
                  <th className="py-2 px-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <EmployeeRow
                    key={emp.agentId}
                    agentId={emp.agentId}
                    entry={emp}
                  />
                ))}
              </tbody>
            </table>
          </ScrollArea>
        )}

        {/* Footer stats */}
        <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{clockedInCount} working</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{employees.length - clockedInCount} out</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
