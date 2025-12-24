"use client";

import { useMemo } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { MockScheduleEntry, MockAgent, mockActivityTypes } from "@/lib/mock-data";
import { getTimeSlotIndex } from "@/types/schedule";
import { Clock } from "lucide-react";

interface AgentHoursSummaryProps {
  agent: MockAgent;
  entries: MockScheduleEntry[];
  children: React.ReactNode;
}

interface CategoryHours {
  category: string;
  categoryLabel: string;
  hours: number;
  minutes: number;
  color: string;
  activities: { name: string; hours: number; minutes: number }[];
}

const categoryLabels: Record<string, string> = {
  WORK: "Working",
  BREAK: "Breaks",
  TRAINING: "Training",
  MEETING: "Meetings",
  PROJECT: "Projects",
  TIME_OFF: "Time Off",
  CUSTOM: "Custom",
};

export function AgentHoursSummary({ agent, entries, children }: AgentHoursSummaryProps) {
  const hoursSummary = useMemo(() => {
    // Calculate hours by category and activity
    const categoryMap: Record<string, CategoryHours> = {};
    let totalMinutes = 0;

    entries.forEach(entry => {
      const activityType = mockActivityTypes.find(a => a.id === entry.activityTypeId);
      if (!activityType) return;

      const startIndex = getTimeSlotIndex(entry.startTime);
      const endIndex = getTimeSlotIndex(entry.endTime);
      const durationMinutes = (endIndex - startIndex) * 30;
      totalMinutes += durationMinutes;

      const category = activityType.category;

      if (!categoryMap[category]) {
        categoryMap[category] = {
          category,
          categoryLabel: categoryLabels[category] || category,
          hours: 0,
          minutes: 0,
          color: activityType.color,
          activities: [],
        };
      }

      categoryMap[category].minutes += durationMinutes;

      // Track individual activities
      const existingActivity = categoryMap[category].activities.find(
        a => a.name === activityType.name
      );
      if (existingActivity) {
        existingActivity.minutes += durationMinutes;
      } else {
        categoryMap[category].activities.push({
          name: activityType.name,
          hours: 0,
          minutes: durationMinutes,
        });
      }
    });

    // Convert minutes to hours:minutes format
    Object.values(categoryMap).forEach(cat => {
      cat.hours = Math.floor(cat.minutes / 60);
      cat.minutes = cat.minutes % 60;
      cat.activities.forEach(act => {
        act.hours = Math.floor(act.minutes / 60);
        act.minutes = act.minutes % 60;
      });
    });

    // Sort by category order
    const categoryOrder = ["WORK", "BREAK", "TRAINING", "MEETING", "PROJECT", "TIME_OFF", "CUSTOM"];
    const sortedCategories = categoryOrder
      .map(cat => categoryMap[cat])
      .filter(Boolean);

    return {
      categories: sortedCategories,
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutes: totalMinutes % 60,
    };
  }, [entries]);

  const formatTime = (hours: number, minutes: number) => {
    if (hours === 0 && minutes === 0) return "0h";
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-72" side="right" align="start">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: agent.color || "#4CAF50" }}
            >
              {agent.firstName[0]}{agent.lastName[0]}
            </div>
            <div>
              <h4 className="text-sm font-semibold">
                {agent.firstName} {agent.lastName}
              </h4>
              <p className="text-xs text-muted-foreground">Daily Schedule Summary</p>
            </div>
          </div>

          {/* Total Hours */}
          <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-md">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Total Scheduled:</span>
            <span className="text-sm font-bold">
              {formatTime(hoursSummary.totalHours, hoursSummary.totalMinutes)}
            </span>
          </div>

          {/* Category Breakdown */}
          {hoursSummary.categories.length > 0 ? (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                By Category
              </h5>
              <div className="space-y-1.5">
                {hoursSummary.categories.map(cat => (
                  <div key={cat.category} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm flex-1">{cat.categoryLabel}</span>
                    <span className="text-sm font-medium">
                      {formatTime(cat.hours, cat.minutes)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No activities scheduled
            </p>
          )}

          {/* Detailed Activity Breakdown (if multiple activities in a category) */}
          {hoursSummary.categories.some(cat => cat.activities.length > 1) && (
            <div className="space-y-2 pt-2 border-t">
              <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Activity Details
              </h5>
              <div className="space-y-1 text-xs">
                {hoursSummary.categories
                  .filter(cat => cat.activities.length > 1)
                  .flatMap(cat =>
                    cat.activities.map(act => (
                      <div key={`${cat.category}-${act.name}`} className="flex items-center gap-2 pl-5">
                        <span className="text-muted-foreground flex-1">{act.name}</span>
                        <span>{formatTime(act.hours, act.minutes)}</span>
                      </div>
                    ))
                  )}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
