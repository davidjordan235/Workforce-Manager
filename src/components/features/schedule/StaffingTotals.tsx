"use client";

import { useMemo } from "react";
import { ExtendedScheduleEntry } from "@/hooks/useSchedule";
import { ActivityType } from "@/hooks/useActivities";
import { ExtendedTimeSlot, getExtendedSlotIndex, MIDNIGHT_SLOT_INDEX } from "@/types/schedule";

interface StaffingTotalsProps {
  timeSlots: ExtendedTimeSlot[];
  entries: ExtendedScheduleEntry[];
  activities: ActivityType[];
  baseDate: string;
}

// Define the categories we want to show with their display info
const categoryConfig = [
  { category: "TOTAL", label: "Total", color: "#374151" },
  { category: "WORK", label: "Working", color: "#4CAF50" },
  { category: "BREAK", label: "Break/Lunch", color: "#FF9800" },
  { category: "TRAINING", label: "Training", color: "#2196F3" },
  { category: "MEETING", label: "Meeting", color: "#9C27B0" },
  { category: "PROJECT", label: "Project", color: "#607D8B" },
  { category: "TIME_OFF", label: "Time Off", color: "#F44336" },
];

export function StaffingTotals({ timeSlots, entries, activities, baseDate }: StaffingTotalsProps) {
  // Calculate totals per slot per category
  const totalsPerSlot = useMemo(() => {
    // Initialize totals for each category
    const categoryTotals: Record<string, number[]> = {};
    categoryConfig.forEach(cat => {
      categoryTotals[cat.category] = new Array(timeSlots.length).fill(0);
    });

    entries.forEach(entry => {
      const startIndex = getExtendedSlotIndex(entry.startTime, entry.date, baseDate, false);
      const endIndex = getExtendedSlotIndex(entry.endTime, entry.date, baseDate, true);
      // Handle entries that wrap around (end index < start index means next day)
      const actualEnd = endIndex <= startIndex ? endIndex + 48 : endIndex;
      const activityType = activities.find(a => a.id === entry.activityTypeId);

      if (!activityType) return;

      for (let i = startIndex; i < actualEnd && i < timeSlots.length; i++) {
        // Increment total
        categoryTotals["TOTAL"][i]++;

        // Increment category-specific total
        // Combine BREAK categories (Break and Lunch are both BREAK category)
        const category = activityType.category;
        if (categoryTotals[category]) {
          categoryTotals[category][i]++;
        }
      }
    });

    return categoryTotals;
  }, [entries, timeSlots.length, activities, baseDate]);

  return (
    <div className="border-t-2 border-gray-300">
      {categoryConfig.map(({ category, label, color }) => (
        <div
          key={category}
          className="flex bg-gray-50 border-b border-gray-200 last:border-b-0"
          style={{ height: "28px" }}
        >
          {/* Label column */}
          <div
            className="sticky left-0 z-30 w-48 flex-shrink-0 bg-gray-50 border-r px-2 flex items-center gap-2"
          >
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium text-gray-700 truncate">
              {label}
            </span>
          </div>

          {/* Totals for each slot */}
          {timeSlots.map((slot, index) => {
            const count = totalsPerSlot[category][index];
            const isTotal = category === "TOTAL";
            const isMidnight = index === MIDNIGHT_SLOT_INDEX;
            const isNextDay = index >= MIDNIGHT_SLOT_INDEX;

            return (
              <div
                key={`${slot.dayOffset}-${slot.time}`}
                className={`w-10 flex-shrink-0 border-r flex items-center justify-center ${
                  slot.minute === 0 ? "border-r-gray-300" : "border-r-gray-200"
                } ${isNextDay ? "bg-blue-50/30" : slot.hour % 2 === 0 ? "bg-gray-50" : "bg-white"} ${
                  isMidnight ? "border-l-4 border-l-orange-500" : ""
                }`}
                style={{ minWidth: "40px" }}
              >
                {count > 0 ? (
                  <span
                    className={`text-xs font-medium ${isTotal ? "font-bold" : ""}`}
                    style={{ color: isTotal ? "#374151" : color }}
                  >
                    {count}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300">-</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
