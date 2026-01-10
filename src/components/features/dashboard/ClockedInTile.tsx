"use client";

import { useClockStatus, ClockStatusEntry } from "@/hooks/useClockStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users } from "lucide-react";

function formatClockInTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface ClockedInEmployeeProps {
  agentId: string;
  entry: ClockStatusEntry;
}

function ClockedInEmployee({ agentId, entry }: ClockedInEmployeeProps) {
  const initials = `${entry.firstName[0]}${entry.lastName[0]}`.toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="relative">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: entry.color || "#4CAF50" }}
        >
          {initials}
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {entry.firstName} {entry.lastName}
        </p>
        <p className="text-xs text-gray-500">
          Since {entry.lastPunchTime ? formatClockInTime(entry.lastPunchTime) : "Unknown"}
        </p>
      </div>
    </div>
  );
}

export function ClockedInTile() {
  const { data: clockStatus, isLoading, error } = useClockStatus();

  // Filter to only clocked-in employees
  const clockedInEmployees = clockStatus
    ? Object.entries(clockStatus)
        .filter(([_, entry]) => entry.isClockedIn)
        .sort((a, b) => {
          // Sort by clock-in time (most recent first)
          const timeA = a[1].lastPunchTime || "";
          const timeB = b[1].lastPunchTime || "";
          return timeB.localeCompare(timeA);
        })
    : [];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-green-600" />
          Who's Clocked In
          {clockedInEmployees.length > 0 && (
            <span className="ml-auto text-sm font-normal text-gray-500">
              {clockedInEmployees.length} employee{clockedInEmployees.length !== 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Failed to load clock status
          </div>
        ) : clockedInEmployees.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No employees currently clocked in
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-1">
              {clockedInEmployees.map(([agentId, entry]) => (
                <ClockedInEmployee key={agentId} agentId={agentId} entry={entry} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
