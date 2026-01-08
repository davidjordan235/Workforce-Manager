"use client";

import { Rnd } from "react-rnd";
import { ExtendedScheduleEntry } from "@/hooks/useSchedule";
import { ActivityType } from "@/hooks/useActivities";
import { getExtendedSlotIndex, getTimeAndDateFromExtendedIndex, MIDNIGHT_SLOT_INDEX } from "@/types/schedule";
import { GripVertical, Copy, Scissors, Trash2 } from "lucide-react";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface ResizableActivityBlockProps {
  entry: ExtendedScheduleEntry;
  activities: ActivityType[];
  baseDate: string;
  totalSlots: number;
  isSelected?: boolean;
  onSelect: (entryId: string) => void;
  onMove: (entryId: string, newStartTime: string, newEndTime: string, newDate?: string) => void;
  onResize: (entryId: string, newStartTime: string, newEndTime: string, newDate?: string) => void;
  onCopy?: (entry: ExtendedScheduleEntry) => void;
  onCut?: (entry: ExtendedScheduleEntry) => void;
  onDelete?: (entryId: string) => void;
}

const SLOT_WIDTH = 40; // 40px per 30-minute slot
const ROW_HEIGHT = 40; // Height of the activity block

export function ResizableActivityBlock({
  entry,
  activities,
  baseDate,
  totalSlots,
  isSelected = false,
  onSelect,
  onMove,
  onResize,
  onCopy,
  onCut,
  onDelete,
}: ResizableActivityBlockProps) {
  const activityType = activities.find(a => a.id === entry.activityTypeId);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(entry.id);
  };

  const handleCopy = () => {
    onCopy?.(entry);
  };

  const handleCut = () => {
    onCut?.(entry);
  };

  const handleDelete = () => {
    onDelete?.(entry.id);
  };

  if (!activityType) {
    return null;
  }

  // Calculate position using extended slot indices
  const startIndex = getExtendedSlotIndex(entry.startTime, entry.date, baseDate, false);
  const endIndex = getExtendedSlotIndex(entry.endTime, entry.date, baseDate, true);

  // Handle entries that wrap around (end index < start index means next day)
  const slotSpan = endIndex > startIndex ? endIndex - startIndex : (endIndex + 48) - startIndex;

  // Check if this entry crosses midnight
  const crossesMidnight = startIndex < MIDNIGHT_SLOT_INDEX && endIndex > MIDNIGHT_SLOT_INDEX;

  const handleDragStop = (e: any, d: { x: number; y: number }) => {
    const newStartIndex = Math.round(d.x / SLOT_WIDTH);
    const newEndIndex = newStartIndex + slotSpan;

    // Clamp to valid range (0 to totalSlots)
    const clampedStartIndex = Math.max(0, Math.min(newStartIndex, totalSlots - slotSpan));
    const clampedEndIndex = clampedStartIndex + slotSpan;

    // Convert back to time and date
    const { time: newStartTime, date: newStartDate } = getTimeAndDateFromExtendedIndex(clampedStartIndex, baseDate);
    const { time: newEndTime } = getTimeAndDateFromExtendedIndex(clampedEndIndex, baseDate);

    // Only update if position actually changed
    if (newStartTime !== entry.startTime || newEndTime !== entry.endTime || newStartDate !== entry.date) {
      onMove(entry.id, newStartTime, newEndTime, newStartDate);
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
    const clampedEndIndex = Math.min(totalSlots, newEndIndex);

    // Convert back to time and date
    const { time: newStartTime, date: newStartDate } = getTimeAndDateFromExtendedIndex(clampedStartIndex, baseDate);
    const { time: newEndTime } = getTimeAndDateFromExtendedIndex(clampedEndIndex, baseDate);

    // Only update if size actually changed
    if (newStartTime !== entry.startTime || newEndTime !== entry.endTime || newStartDate !== entry.date) {
      onResize(entry.id, newStartTime, newEndTime, newStartDate);
    }
  };

  // Use key to force re-mount when entry times change (uncontrolled mode)
  const rndKey = `${entry.id}-${entry.startTime}-${entry.endTime}-${entry.date}`;

  // Format time for display
  const formatTimeShort = (time: string, isNextDay: boolean = false) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "p" : "a";
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const timeStr = minutes === 0 ? `${displayHour}${period}` : `${displayHour}:${minutes.toString().padStart(2, "0")}${period}`;
    return isNextDay ? `${timeStr}+1` : timeStr;
  };

  // Check if end time is on next day
  const endIsNextDay = entry._dayOffset === 1 || endIndex > startIndex + slotSpan || entry.date !== baseDate;

  const rndContent = (
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
          {formatTimeShort(entry.startTime)}-{formatTimeShort(entry.endTime, crossesMidnight || entry._dayOffset === 1)}
        </span>
      </div>
      {/* Resize indicators */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-white/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      {/* Midnight crossing indicator */}
      {crossesMidnight && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-orange-400/80 pointer-events-none"
          style={{ left: `${(MIDNIGHT_SLOT_INDEX - startIndex) * SLOT_WIDTH}px` }}
        />
      )}
    </Rnd>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {rndContent}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCut}>
          <Scissors className="h-4 w-4 mr-2" />
          Cut
          <span className="ml-auto text-xs text-muted-foreground">Ctrl+X</span>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
          <span className="ml-auto text-xs text-muted-foreground">Del</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
