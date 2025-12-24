"use client";

import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { MockScheduleEntry, mockActivityTypes } from "@/lib/mock-data";
import { useAgents } from "@/hooks/useAgents";
import { useScheduleByDateRange } from "@/hooks/useSchedule";
import { getTimeSlotIndex } from "@/types/schedule";
import { Loader2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface WeeklyScheduleGridProps {
  date: Date;
  onDayClick: (date: Date) => void;
}

export function WeeklyScheduleGrid({ date, onDayClick }: WeeklyScheduleGridProps) {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const startDate = format(weekStart, "yyyy-MM-dd");
  const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const { data: scheduleEntries, isLoading: scheduleLoading } = useScheduleByDateRange(startDate, endDate);
  const { data: agents, isLoading: agentsLoading } = useAgents();

  // Group entries by agent and date
  const entriesByAgentAndDate = useMemo(() => {
    const map: Record<string, Record<string, MockScheduleEntry[]>> = {};

    agents?.forEach(agent => {
      map[agent.id] = {};
      weekDays.forEach(day => {
        map[agent.id][format(day, "yyyy-MM-dd")] = [];
      });
    });

    scheduleEntries?.forEach(entry => {
      if (map[entry.agentId]) {
        if (!map[entry.agentId][entry.date]) {
          map[entry.agentId][entry.date] = [];
        }
        map[entry.agentId][entry.date].push(entry);
      }
    });

    return map;
  }, [scheduleEntries, agents, weekDays]);

  if (scheduleLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden rounded-lg border bg-white">
      <div className="h-full overflow-auto">
        <div className="min-w-max">
          {/* Week Header */}
          <div className="sticky top-0 z-20 flex bg-gray-100 border-b">
            <div className="sticky left-0 z-30 w-48 flex-shrink-0 bg-gray-100 border-r p-2 font-semibold text-sm">
              Agent
            </div>
            {weekDays.map(day => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDayClick(day)}
                  className={`flex-1 min-w-[140px] border-r p-2 text-center cursor-pointer hover:bg-gray-200 transition-colors ${
                    isToday ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="text-xs text-gray-500 uppercase">
                    {format(day, "EEE")}
                  </div>
                  <div className={`text-lg font-semibold ${isToday ? "text-blue-600" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="text-xs text-gray-400">
                    {format(day, "MMM")}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Agent Rows */}
          <div>
            {agents?.map(agent => (
              <div key={agent.id} className="flex border-b hover:bg-gray-50/50">
                {/* Agent info (sticky) */}
                <div className="sticky left-0 z-10 w-48 flex-shrink-0 bg-white border-r p-2 flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: agent.color || "#4CAF50" }}
                  >
                    {agent.firstName[0]}{agent.lastName[0]}
                  </div>
                  <span className="truncate text-sm font-medium">
                    {agent.firstName} {agent.lastName}
                  </span>
                </div>

                {/* Day cells */}
                {weekDays.map(day => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const entries = entriesByAgentAndDate[agent.id]?.[dateStr] || [];
                  const isToday = isSameDay(day, new Date());

                  return (
                    <DayCell
                      key={dateStr}
                      entries={entries}
                      isToday={isToday}
                      onClick={() => onDayClick(day)}
                      agentName={`${agent.firstName} ${agent.lastName}`}
                      dateLabel={format(day, "EEEE, MMMM d, yyyy")}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Weekly Totals Footer */}
          <WeeklyTotals
            weekDays={weekDays}
            entriesByDate={scheduleEntries || []}
          />
        </div>
      </div>
    </div>
  );
}

// Helper to calculate activity breakdown
function getActivityBreakdown(entries: MockScheduleEntry[]) {
  const breakdown: Record<string, { activityType: typeof mockActivityTypes[0]; minutes: number }> = {};

  entries.forEach(entry => {
    const activityType = mockActivityTypes.find(a => a.id === entry.activityTypeId);
    if (!activityType) return;

    const start = getTimeSlotIndex(entry.startTime);
    const end = getTimeSlotIndex(entry.endTime);
    const minutes = (end - start) * 30;

    if (!breakdown[activityType.id]) {
      breakdown[activityType.id] = { activityType, minutes: 0 };
    }
    breakdown[activityType.id].minutes += minutes;
  });

  return Object.values(breakdown)
    .map(b => ({ ...b, hours: b.minutes / 60 }))
    .sort((a, b) => b.minutes - a.minutes);
}

// Format time for display (e.g., "8a" or "5:30p")
function formatTime(time: string) {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const m = minutes;
  const period = h >= 12 ? "p" : "a";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === "00" ? `${displayHour}${period}` : `${displayHour}:${m}${period}`;
}

// Day cell showing shift start/end times with hover details
function DayCell({
  entries,
  isToday,
  onClick,
  agentName,
  dateLabel,
}: {
  entries: MockScheduleEntry[];
  isToday: boolean;
  onClick: () => void;
  agentName: string;
  dateLabel: string;
}) {
  // Calculate shift times (earliest start, latest end) and total hours
  const shiftInfo = useMemo(() => {
    if (entries.length === 0) return null;

    // Sort by start time
    const sorted = [...entries].sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Find earliest start and latest end
    const shiftStart = sorted[0].startTime;
    const shiftEnd = sorted.reduce((latest, entry) =>
      entry.endTime > latest ? entry.endTime : latest,
      sorted[0].endTime
    );

    // Calculate total hours and working hours
    let totalMinutes = 0;
    let workingMinutes = 0;

    entries.forEach(entry => {
      const activityType = mockActivityTypes.find(a => a.id === entry.activityTypeId);
      const start = getTimeSlotIndex(entry.startTime);
      const end = getTimeSlotIndex(entry.endTime);
      const duration = (end - start) * 30;
      totalMinutes += duration;
      if (activityType?.countsAsWorking) {
        workingMinutes += duration;
      }
    });

    return {
      shiftStart,
      shiftEnd,
      totalHours: totalMinutes / 60,
      workingHours: workingMinutes / 60,
    };
  }, [entries]);

  const activityBreakdown = useMemo(() => getActivityBreakdown(entries), [entries]);

  const cellContent = (
    <div
      onClick={onClick}
      className={`flex-1 min-w-[140px] border-r p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
        isToday ? "bg-blue-50/50" : ""
      }`}
      style={{ minHeight: "60px" }}
    >
      {shiftInfo ? (
        <div className="flex flex-col items-center justify-center h-full gap-1">
          {/* Shift times */}
          <div className="text-sm font-semibold text-gray-800">
            {formatTime(shiftInfo.shiftStart)} - {formatTime(shiftInfo.shiftEnd)}
          </div>

          {/* Hours summary */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">
              {shiftInfo.totalHours.toFixed(1)}h total
            </span>
            <span className="text-green-600 font-medium">
              {shiftInfo.workingHours.toFixed(1)}h work
            </span>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-xs text-gray-400">
          Off
        </div>
      )}
    </div>
  );

  if (!shiftInfo) {
    return cellContent;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {cellContent}
      </HoverCardTrigger>
      <HoverCardContent className="w-64" side="bottom">
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">{agentName}</h4>
            <p className="text-xs text-muted-foreground">{dateLabel}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Shift:</span>
            <span className="font-medium">
              {formatTime(shiftInfo.shiftStart)} - {formatTime(shiftInfo.shiftEnd)}
            </span>
          </div>

          <div className="space-y-1.5">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Activity Breakdown
            </h5>
            {activityBreakdown.map(({ activityType, hours }) => (
              <div key={activityType.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: activityType.color }}
                />
                <span className="text-sm flex-1">{activityType.name}</span>
                <span className="text-sm font-medium">{hours.toFixed(1)}h</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t flex justify-between text-sm">
            <span className="text-gray-600">Total:</span>
            <span className="font-bold">{shiftInfo.totalHours.toFixed(1)}h</span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// Weekly totals footer
function WeeklyTotals({
  weekDays,
  entriesByDate,
}: {
  weekDays: Date[];
  entriesByDate: MockScheduleEntry[];
}) {
  // Group entries by date
  const entriesGroupedByDate = useMemo(() => {
    const grouped: Record<string, MockScheduleEntry[]> = {};
    weekDays.forEach(day => {
      grouped[format(day, "yyyy-MM-dd")] = [];
    });
    entriesByDate.forEach(entry => {
      if (grouped[entry.date]) {
        grouped[entry.date].push(entry);
      }
    });
    return grouped;
  }, [weekDays, entriesByDate]);

  const totalsByDate = useMemo(() => {
    const totals: Record<string, { total: number; working: number; agentCount: number }> = {};

    weekDays.forEach(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      totals[dateStr] = { total: 0, working: 0, agentCount: 0 };

      const dayEntries = entriesGroupedByDate[dateStr] || [];
      const agentIds = new Set<string>();

      dayEntries.forEach(entry => {
        const activityType = mockActivityTypes.find(a => a.id === entry.activityTypeId);
        const start = getTimeSlotIndex(entry.startTime);
        const end = getTimeSlotIndex(entry.endTime);
        const hours = (end - start) * 30 / 60;

        totals[dateStr].total += hours;
        agentIds.add(entry.agentId);
        if (activityType?.countsAsWorking) {
          totals[dateStr].working += hours;
        }
      });

      totals[dateStr].agentCount = agentIds.size;
    });

    return totals;
  }, [weekDays, entriesGroupedByDate]);

  return (
    <div className="sticky bottom-0 flex bg-gray-100 border-t-2 border-gray-300">
      <div className="sticky left-0 z-30 w-48 flex-shrink-0 bg-gray-100 border-r p-2 flex flex-col justify-center" style={{ minHeight: "60px" }}>
        <div className="text-xs font-semibold text-gray-600">Daily Totals</div>
        <div className="text-[10px] text-gray-500">Hover for details</div>
      </div>
      {weekDays.map(day => {
        const dateStr = format(day, "yyyy-MM-dd");
        const { total, working, agentCount } = totalsByDate[dateStr] || { total: 0, working: 0, agentCount: 0 };
        const isToday = isSameDay(day, new Date());
        const dayEntries = entriesGroupedByDate[dateStr] || [];
        const activityBreakdown = getActivityBreakdown(dayEntries);

        const cellContent = (
          <div
            key={dateStr}
            className={`flex-1 min-w-[140px] border-r p-2 text-center cursor-default hover:bg-gray-200 transition-colors flex flex-col items-center justify-center ${
              isToday ? "bg-blue-50" : ""
            }`}
            style={{ minHeight: "60px" }}
          >
            <div className="text-sm font-bold text-gray-700">
              {total.toFixed(1)}h
            </div>
            <div className="text-xs text-green-600">
              {working.toFixed(1)}h working
            </div>
          </div>
        );

        if (dayEntries.length === 0) {
          return cellContent;
        }

        return (
          <HoverCard key={dateStr} openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              {cellContent}
            </HoverCardTrigger>
            <HoverCardContent className="w-72" side="top">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{format(day, "EEEE, MMMM d")}</h4>
                  <p className="text-xs text-muted-foreground">{agentCount} agents scheduled</p>
                </div>

                <div className="space-y-1.5">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Activity Totals (All Agents)
                  </h5>
                  {activityBreakdown.map(({ activityType, hours }) => (
                    <div key={activityType.id} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: activityType.color }}
                      />
                      <span className="text-sm flex-1">{activityType.name}</span>
                      <span className="text-sm font-medium">{hours.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Hours:</span>
                    <span className="font-bold">{total.toFixed(1)}h</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Working Hours:</span>
                    <span className="font-bold text-green-600">{working.toFixed(1)}h</span>
                  </div>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
}
