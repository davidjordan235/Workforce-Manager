"use client";

import { Rnd } from "react-rnd";
import { MockScheduleEntry } from "@/lib/mock-data";
import { getActivityType } from "@/hooks/useSchedule";
import { getTimeSlotIndex, getTimeFromSlotIndex } from "@/types/schedule";
import { GripVertical } from "lucide-react";

interface ResizableActivityBlockProps {
  entry: MockScheduleEntry;
  isSelected?: boolean;
  onSelect: (entryId: string) => void;
  onMove: (entryId: string, newStartTime: string, newEndTime: string) => void;
  onResize: (entryId: string, newStartTime: string, newEndTime: string) => void;
}

const SLOT_WIDTH = 40; // 40px per 30-minute slot
const ROW_HEIGHT = 40; // Height of the activity block

export function ResizableActivityBlock({
  entry,
  isSelected = false,
  onSelect,
  onMove,
  onResize,
}: ResizableActivityBlockProps) {
  const activityType = getActivityType(entry.activityTypeId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(entry.id);
  };

  if (!activityType) {
    return null;
  }

  const startIndex = getTimeSlotIndex(entry.startTime);
  const endIndex = getTimeSlotIndex(entry.endTime);
  const slotSpan = endIndex - startIndex;

  const handleDragStop = (e: any, d: { x: number; y: number }) => {
    const newStartIndex = Math.round(d.x / SLOT_WIDTH);
    const newEndIndex = newStartIndex + slotSpan;

    // Clamp to valid range
    const clampedStartIndex = Math.max(0, Math.min(newStartIndex, 48 - slotSpan));
    const clampedEndIndex = clampedStartIndex + slotSpan;

    const newStartTime = getTimeFromSlotIndex(clampedStartIndex);
    const newEndTime = getTimeFromSlotIndex(clampedEndIndex);

    // Only update if position actually changed
    if (newStartTime !== entry.startTime || newEndTime !== entry.endTime) {
      onMove(entry.id, newStartTime, newEndTime);
    }
  };

  const handleResizeStop = (
    e: any,
    direction: string,
    ref: HTMLElement,
    delta: { width: number; height: number },
    position: { x: number; y: number }
  ) => {
    const newWidth = ref.offsetWidth;
    const newSlotSpan = Math.max(1, Math.round(newWidth / SLOT_WIDTH));
    const newStartIndex = Math.round(position.x / SLOT_WIDTH);
    const newEndIndex = newStartIndex + newSlotSpan;

    // Clamp to valid range
    const clampedStartIndex = Math.max(0, newStartIndex);
    const clampedEndIndex = Math.min(48, newEndIndex);

    const newStartTime = getTimeFromSlotIndex(clampedStartIndex);
    const newEndTime = getTimeFromSlotIndex(clampedEndIndex);

    // Only update if size actually changed
    if (newStartTime !== entry.startTime || newEndTime !== entry.endTime) {
      onResize(entry.id, newStartTime, newEndTime);
    }
  };

  // Use key to force re-mount when entry times change (uncontrolled mode)
  const rndKey = `${entry.id}-${entry.startTime}-${entry.endTime}`;

  return (
    <Rnd
      key={rndKey}
      default={{
        x: startIndex * SLOT_WIDTH,
        y: 0,
        width: slotSpan * SLOT_WIDTH - 2,
        height: ROW_HEIGHT,
      }}
      dragGrid={[SLOT_WIDTH, 1]}
      resizeGrid={[SLOT_WIDTH, 1]}
      enableResizing={{
        left: true,
        right: true,
        top: false,
        bottom: false,
        topLeft: false,
        topRight: false,
        bottomLeft: false,
        bottomRight: false,
      }}
      dragAxis="x"
      bounds="parent"
      minWidth={SLOT_WIDTH}
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      onClick={handleClick}
      style={{
        backgroundColor: activityType.color,
        color: activityType.textColor,
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        cursor: "grab",
        zIndex: isSelected ? 20 : 10,
        outline: isSelected ? "2px solid #3b82f6" : "none",
        outlineOffset: "1px",
        boxShadow: isSelected ? "0 0 0 4px rgba(59, 130, 246, 0.3)" : undefined,
      }}
      resizeHandleStyles={{
        left: {
          width: "12px",
          left: "-2px",
          cursor: "ew-resize",
          background: "transparent",
        },
        right: {
          width: "12px",
          right: "-2px",
          cursor: "ew-resize",
          background: "transparent",
        },
      }}
      resizeHandleClasses={{
        left: "hover:bg-white/30 transition-colors rounded-l",
        right: "hover:bg-white/30 transition-colors rounded-r",
      }}
      className="group shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-center px-2 py-1 w-full h-full overflow-hidden">
        <GripVertical className="h-3 w-3 opacity-50 mr-1 flex-shrink-0" />
        <span className="truncate font-semibold text-xs">{activityType.shortName}</span>
        <span className="ml-1 text-[10px] opacity-80 truncate hidden sm:inline">
          {entry.startTime}-{entry.endTime}
        </span>
      </div>
      {/* Resize indicators */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Rnd>
  );
}
