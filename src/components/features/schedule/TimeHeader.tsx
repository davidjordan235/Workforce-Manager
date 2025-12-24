"use client";

import { TimeSlot } from "@/types/schedule";

interface TimeHeaderProps {
  timeSlots: TimeSlot[];
}

export function TimeHeader({ timeSlots }: TimeHeaderProps) {
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

        return (
          <div
            key={slot.time}
            className={`w-10 flex-shrink-0 border-r text-center text-xs ${
              slot.minute === 0 ? "border-r-gray-300" : "border-r-gray-200"
            } ${isEvenHour ? "bg-gray-100" : "bg-gray-50"}`}
            style={{ minWidth: "40px" }}
          >
            {showLabel && (
              <div className="py-1 font-medium text-gray-600">
                {slot.hour === 0
                  ? "12a"
                  : slot.hour < 12
                  ? `${slot.hour}a`
                  : slot.hour === 12
                  ? "12p"
                  : `${slot.hour - 12}p`}
              </div>
            )}
            {!showLabel && <div className="py-1 text-gray-400">30</div>}
          </div>
        );
      })}
    </div>
  );
}
