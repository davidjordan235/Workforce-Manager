"use client";

import { useMemo } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { useAgents } from "@/hooks/useAgents";
import { useScheduleByDateRange, type ScheduleEntry } from "@/hooks/useSchedule";
import { useActivities, type ActivityType } from "@/hooks/useActivities";
import { useInOfficeDays, useToggleInOfficeDay, isInOffice } from "@/hooks/useInOfficeDays";
import { useSettings } from "@/hooks/useSettings";
import { getTimeSlotIndex, getSlotSpan, isOvernightShift } from "@/types/schedule";
import { Loader2, Building2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";

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
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { data: inOfficeDays } = useInOfficeDays(startDate, endDate);
  const toggleInOffice = useToggleInOfficeDay();
  const { data: settings } = useSettings();

  const inOfficeColor = settings?.inOfficeColor || "#9333ea";
  const inOfficeTextColor = settings?.inOfficeTextColor || "#ffffff";

  // Group entries by agent and date
  const entriesByAgentAndDate = useMemo(() => {
    const map: Record<string, Record<string, ScheduleEntry[]>> = {};

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

  if (scheduleLoading || agentsLoading || activitiesLoading) {
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
                  const inOffice = isInOffice(inOfficeDays, agent.id, dateStr);

                  return (
                    <DayCell
                      key={dateStr}
                      entries={entries}
                      activities={activities || []}
                      isToday={isToday}
                      isInOffice={inOffice}
                      inOfficeColor={inOfficeColor}
                      inOfficeTextColor={inOfficeTextColor}
                      onClick={() => onDayClick(day)}
                      onToggleInOffice={() => toggleInOffice.mutate({ agentId: agent.id, date: dateStr })}
                      agentId={agent.id}
                      agentName={`${agent.firstName} ${agent.lastName}`}
                      dateStr={dateStr}
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
            activities={activities || []}
          />
        </div>
      </div>
    </div>
  );
}

// Helper to calculate activity breakdown (handles overnight shifts)
function getActivityBreakdown(entries: ScheduleEntry[], activities: ActivityType[]) {
  const breakdown: Record<string, { activityType: ActivityType; minutes: number }> = {};

  entries.forEach(entry => {
    const activityType = activities.find(a => a.id === entry.activityTypeId);
    if (!activityType) return;

    // Use getSlotSpan which handles overnight shifts correctly
    const slots = getSlotSpan(entry.startTime, entry.endTime);
    const minutes = slots * 30;

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
// isEndTime: true if this is an end time
// isOvernight: true if this end time is on the next day (shows "+1")
function formatTime(time: string, isEndTime: boolean = false, isOvernight: boolean = false) {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const m = minutes;

  // Handle midnight: when used as end time, display as "12a"
  if (h === 0 && m === "00" && isEndTime) {
    return "12a";
  }

  const period = h >= 12 ? "p" : "a";
  const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const timeStr = m === "00" ? `${displayHour}${period}` : `${displayHour}:${m}${period}`;

  // Add "+1" indicator for overnight end times
  if (isOvernight && isEndTime) {
    return `${timeStr}+1`;
  }

  return timeStr;
}

// Day cell showing shift start/end times with hover details
function DayCell({
  entries,
  activities,
  isToday,
  isInOffice,
  inOfficeColor,
  inOfficeTextColor,
  onClick,
  onToggleInOffice,
  agentId,
  agentName,
  dateStr,
  dateLabel,
}: {
  entries: ScheduleEntry[];
  activities: ActivityType[];
  isToday: boolean;
  isInOffice: boolean;
  inOfficeColor: string;
  inOfficeTextColor: string;
  onClick: () => void;
  onToggleInOffice: () => void;
  agentId: string;
  agentName: string;
  dateStr: string;
  dateLabel: string;
}) {
  // Calculate shift times (earliest start, latest end), lunch times, and total hours
  const shiftInfo = useMemo(() => {
    if (entries.length === 0) return null;

    // Find earliest start time by comparing slot indices (not strings, since "00:00" < "23:00" alphabetically)
    let shiftStart = entries[0].startTime;
    let earliestStartIndex = getTimeSlotIndex(entries[0].startTime);
    entries.forEach(entry => {
      const entryStartIndex = getTimeSlotIndex(entry.startTime);
      if (entryStartIndex < earliestStartIndex) {
        shiftStart = entry.startTime;
        earliestStartIndex = entryStartIndex;
      }
    });

    // Find latest end time by calculating absolute end position
    // For overnight shifts, end position is 48 + endIndex (next day)
    // For same-day shifts, end position is just endIndex (or 48 for midnight)
    let shiftEnd = entries[0].endTime;
    let shiftIsOvernight = isOvernightShift(entries[0].startTime, entries[0].endTime);
    let latestAbsoluteEnd = shiftIsOvernight
      ? 48 + getTimeSlotIndex(entries[0].endTime)
      : getTimeSlotIndex(entries[0].endTime, true);

    entries.forEach(entry => {
      const entryIsOvernight = isOvernightShift(entry.startTime, entry.endTime);
      const entryAbsoluteEnd = entryIsOvernight
        ? 48 + getTimeSlotIndex(entry.endTime)
        : getTimeSlotIndex(entry.endTime, true);

      if (entryAbsoluteEnd > latestAbsoluteEnd) {
        shiftEnd = entry.endTime;
        shiftIsOvernight = entryIsOvernight;
        latestAbsoluteEnd = entryAbsoluteEnd;
      }
    });

    // Find lunch entry (activity type with name "Lunch" or shortName "LCH" or category BREAK)
    const lunchEntry = entries.find(entry => {
      const activityType = activities.find(a => a.id === entry.activityTypeId);
      return activityType?.name === "Lunch" ||
             activityType?.shortName === "LCH" ||
             (activityType?.category === "BREAK" && activityType?.name?.toLowerCase().includes("lunch"));
    });

    const lunchIsOvernight = lunchEntry
      ? isOvernightShift(lunchEntry.startTime, lunchEntry.endTime)
      : false;

    // Calculate total hours and working hours using getSlotSpan (handles overnight)
    let totalMinutes = 0;
    let workingMinutes = 0;

    entries.forEach(entry => {
      const activityType = activities.find(a => a.id === entry.activityTypeId);
      const slots = getSlotSpan(entry.startTime, entry.endTime);
      const duration = slots * 30;
      totalMinutes += duration;
      if (activityType?.countsAsWorking) {
        workingMinutes += duration;
      }
    });

    return {
      shiftStart,
      shiftEnd,
      shiftIsOvernight,
      lunchStart: lunchEntry?.startTime || null,
      lunchEnd: lunchEntry?.endTime || null,
      lunchIsOvernight,
      totalHours: totalMinutes / 60,
      workingHours: workingMinutes / 60,
    };
  }, [entries, activities]);

  const activityBreakdown = useMemo(() => getActivityBreakdown(entries, activities), [entries, activities]);

  // Determine background style based on in-office status
  const getCellStyle = (): React.CSSProperties => {
    if (isInOffice) {
      // Use the configurable color with opacity for background
      return {
        backgroundColor: `${inOfficeColor}20`, // 20 is ~12% opacity in hex
        minHeight: "80px",
      };
    }
    return { minHeight: "80px" };
  };

  const cellContent = (
    <div
      onClick={onClick}
      className={`flex-1 min-w-[140px] border-r p-2 cursor-pointer hover:bg-blue-50 transition-colors relative ${
        isToday && !isInOffice ? "bg-blue-50/50" : ""
      }`}
      style={getCellStyle()}
    >
      {/* In-office indicator */}
      {isInOffice && (
        <div className="absolute top-1 right-1">
          <Building2 className="h-4 w-4" style={{ color: inOfficeColor }} />
        </div>
      )}

      {shiftInfo ? (
        <div className="flex flex-col items-center justify-center h-full gap-0.5">
          {/* Shift times */}
          <div className="text-sm font-semibold text-gray-800">
            {formatTime(shiftInfo.shiftStart)} - {formatTime(shiftInfo.shiftEnd, true, shiftInfo.shiftIsOvernight)}
          </div>

          {/* Lunch times */}
          {shiftInfo.lunchStart && shiftInfo.lunchEnd && (
            <div className="text-xs text-orange-600">
              Lunch: {formatTime(shiftInfo.lunchStart)} - {formatTime(shiftInfo.lunchEnd, true, shiftInfo.lunchIsOvernight)}
            </div>
          )}

          {/* Hours summary */}
          <div className="flex items-center gap-2 text-xs mt-0.5">
            <span className="text-gray-500">
              {shiftInfo.totalHours.toFixed(1)}h
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

  // Wrap in context menu
  const wrappedCell = (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {cellContent}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuCheckboxItem
          checked={isInOffice}
          onCheckedChange={onToggleInOffice}
        >
          <Building2 className="h-4 w-4 mr-2" />
          In Office
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  if (!shiftInfo) {
    return wrappedCell;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <HoverCard openDelay={200} closeDelay={100}>
            <HoverCardTrigger asChild>
              {cellContent}
            </HoverCardTrigger>
            <HoverCardContent className="w-64" side="bottom">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-semibold">{agentName}</h4>
                  <p className="text-xs text-muted-foreground">{dateLabel}</p>
                  {isInOffice && (
                    <p className="text-xs font-medium flex items-center gap-1 mt-1" style={{ color: inOfficeColor }}>
                      <Building2 className="h-3 w-3" /> In Office
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Shift:</span>
                  <span className="font-medium">
                    {formatTime(shiftInfo.shiftStart)} - {formatTime(shiftInfo.shiftEnd, true, shiftInfo.shiftIsOvernight)}
                    {shiftInfo.shiftIsOvernight && <span className="text-xs text-muted-foreground ml-1">(next day)</span>}
                  </span>
                </div>

                {shiftInfo.lunchStart && shiftInfo.lunchEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Lunch:</span>
                    <span className="font-medium text-orange-600">
                      {formatTime(shiftInfo.lunchStart)} - {formatTime(shiftInfo.lunchEnd, true, shiftInfo.lunchIsOvernight)}
                    </span>
                  </div>
                )}

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
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuCheckboxItem
          checked={isInOffice}
          onCheckedChange={onToggleInOffice}
        >
          <Building2 className="h-4 w-4 mr-2" />
          In Office
        </ContextMenuCheckboxItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Weekly totals footer
function WeeklyTotals({
  weekDays,
  entriesByDate,
  activities,
}: {
  weekDays: Date[];
  entriesByDate: ScheduleEntry[];
  activities: ActivityType[];
}) {
  // Group entries by date
  const entriesGroupedByDate = useMemo(() => {
    const grouped: Record<string, ScheduleEntry[]> = {};
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
        const activityType = activities.find(a => a.id === entry.activityTypeId);
        // Use getSlotSpan which handles overnight shifts correctly
        const slots = getSlotSpan(entry.startTime, entry.endTime);
        const hours = slots * 30 / 60;

        totals[dateStr].total += hours;
        agentIds.add(entry.agentId);
        if (activityType?.countsAsWorking) {
          totals[dateStr].working += hours;
        }
      });

      totals[dateStr].agentCount = agentIds.size;
    });

    return totals;
  }, [weekDays, entriesGroupedByDate, activities]);

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
        const activityBreakdown = getActivityBreakdown(dayEntries, activities);

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
