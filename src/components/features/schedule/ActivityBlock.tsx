"use client";

import { useRef, useCallback, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { MockScheduleEntry } from "@/lib/mock-data";
import { getActivityType } from "@/hooks/useSchedule";
import { GripVertical } from "lucide-react";

interface ActivityBlockProps {
  entry: MockScheduleEntry;
  isDragging?: boolean;
  onResizeStart?: (entryId: string, edge: "left" | "right") => void;
  onResizeMove?: (entryId: string, edge: "left" | "right", deltaSlots: number) => void;
  onResizeEnd?: (entryId: string, edge: "left" | "right", deltaSlots: number) => void;
}

export function ActivityBlock({
  entry,
  isDragging = false,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: ActivityBlockProps) {
  const activityType = getActivityType(entry.activityTypeId);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{
    edge: "left" | "right";
    startX: number;
    currentDelta: number;
  } | null>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging: isDndDragging } = useDraggable({
    id: entry.id,
    disabled: isResizing, // Disable dragging while resizing
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, edge: "left" | "right") => {
      e.stopPropagation();
      e.preventDefault();

      setIsResizing(true);

      resizeRef.current = {
        edge,
        startX: e.clientX,
        currentDelta: 0,
      };

      onResizeStart?.(entry.id, edge);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizeRef.current) return;

        const deltaX = moveEvent.clientX - resizeRef.current.startX;
        // Each slot is 40px wide
        const deltaSlots = Math.round(deltaX / 40);

        if (deltaSlots !== resizeRef.current.currentDelta) {
          resizeRef.current.currentDelta = deltaSlots;
          onResizeMove?.(entry.id, edge, deltaSlots);
        }
      };

      const handleMouseUp = () => {
        if (resizeRef.current) {
          onResizeEnd?.(entry.id, resizeRef.current.edge, resizeRef.current.currentDelta);
          resizeRef.current = null;
        }
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [entry.id, onResizeStart, onResizeMove, onResizeEnd]
  );

  if (!activityType) {
    return null;
  }

  // Calculate if block is wide enough to show handles
  const showHandles = true; // Always show on hover

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        backgroundColor: activityType.color,
        color: activityType.textColor,
      }}
      className={`h-full rounded text-xs font-medium select-none flex items-center overflow-visible relative group ${
        isDragging || isDndDragging ? "opacity-80 shadow-lg z-50" : "opacity-100"
      } ${isResizing ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
    >
      {/* Left resize handle - always visible on hover */}
      {showHandles && (
        <div
          className="absolute -left-1 top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeMouseDown(e, "left")}
          title="Drag to resize"
        >
          <div className="w-1 h-4 bg-white/80 rounded-full shadow" />
        </div>
      )}

      {/* Main content area - draggable */}
      <div
        className="flex-1 h-full px-2 py-1 cursor-grab active:cursor-grabbing flex items-center overflow-hidden"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-3 w-3 opacity-50 mr-1 flex-shrink-0" />
        <span className="truncate font-semibold">{activityType.shortName}</span>
        <span className="ml-1 text-[10px] opacity-80 truncate hidden sm:inline">
          {entry.startTime}-{entry.endTime}
        </span>
      </div>

      {/* Right resize handle - always visible on hover */}
      {showHandles && (
        <div
          className="absolute -right-1 top-0 bottom-0 w-3 cursor-ew-resize z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleResizeMouseDown(e, "right")}
          title="Drag to resize"
        >
          <div className="w-1 h-4 bg-white/80 rounded-full shadow" />
        </div>
      )}
    </div>
  );
}
