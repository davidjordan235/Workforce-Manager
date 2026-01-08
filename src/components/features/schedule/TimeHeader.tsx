"use client";

import { ExtendedTimeSlot, MIDNIGHT_SLOT_INDEX } from "@/types/schedule";

interface TimeHeaderProps {
  timeSlots: ExtendedTimeSlot[];
  nextDateLabel?: string; // e.g., "12/26"
}

export function TimeHeader({ timeSlots, nextDateLabel }: TimeHeaderProps) {
  return (
    <div className="sticky top-0 z-20 flex bg-gray-100 border-b">
      {/* Agent column header */}
      <div className="sticky left-0 z-30 w-48 flex-shrink-0 bg-gray-100 border-r p-2 font-semibold text-sm">
        Agent
      </div>

      {/* Time slot headers */}
      {timeSlots.map((slot, index) => {
        // Only show label for full hours
        const showLabel = slot.minute === 0;
        const isEvenHour = slot.hour % 2 === 0;
        const isMidnight = index === MIDNIGHT_SLOT_INDEX;
        const isNextDay = index >= MIDNIGHT_SLOT_INDEX;

        return (
          <div
            key={`${slot.dayOffset}-${slot.time}`}
            className={`w-10 flex-shrink-0 border-r text-center text-xs relative ${
              slot.minute === 0 ? "border-r-gray-300" : "border-r-gray-200"
            } ${isNextDay ? "bg-blue-50/50" : isEvenHour ? "bg-gray-100" : "bg-gray-50"} ${
              isMidnight ? "border-l-4 border-l-orange-500" : ""
            }`}
            style={{ minWidth: "40px" }}
          >
            {showLabel && (
              <div className={`py-1 font-medium ${isNextDay ? "text-blue-700" : "text-gray-600"}`}>
                {slot.hour === 0
                  ? "12a"
                  : slot.hour < 12
                  ? `${slot.hour}a`
                  : slot.hour === 12
                  ? "12p"
                  : `${slot.hour - 12}p`}
                {/* Show date label at midnight and 6am of next day */}
                {isMidnight && nextDateLabel && (
                  <div className="text-[9px] text-orange-600 font-semibold">
                    {nextDateLabel}
                  </div>
                )}
              </div>
            )}
            {!showLabel && (
              <div className={`py-1 ${isNextDay ? "text-blue-400" : "text-gray-400"}`}>30</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
