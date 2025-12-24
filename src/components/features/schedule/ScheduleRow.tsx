"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { MockAgent, MockScheduleEntry } from "@/lib/mock-data";
import { TimeSlot, getTimeSlotIndex } from "@/types/schedule";
import { ResizableActivityBlock } from "./ResizableActivityBlock";
import { AgentHoursSummary } from "./AgentHoursSummary";

interface ScheduleRowProps {
  agent: MockAgent;
  timeSlots: TimeSlot[];
  entries: MockScheduleEntry[];
  dragOverInfo: { agentId: string; slotIndex: number } | null;
  selectedEntryId: string | null;
  pasteTarget: { agentId: string; slotIndex: number } | null;
  hasClipboard: boolean;
  onEntrySelect: (entryId: string) => void;
  onSlotClick: (agentId: string, slotIndex: number) => void;
  onEntryMove: (entryId: string, newStartTime: string, newEndTime: string) => void;
  onEntryResize: (entryId: string, newStartTime: string, newEndTime: string) => void;
}

export function ScheduleRow({
  agent,
  timeSlots,
  entries,
  dragOverInfo,
  selectedEntryId,
  pasteTarget,
  hasClipboard,
  onEntrySelect,
  onSlotClick,
  onEntryMove,
  onEntryResize,
}: ScheduleRowProps) {
  // Calculate which slots are occupied by entries
  const occupiedSlots = useMemo(() => {
    const slots: Record<number, MockScheduleEntry> = {};
    entries.forEach(entry => {
      const startIndex = getTimeSlotIndex(entry.startTime);
      const endIndex = getTimeSlotIndex(entry.endTime);
      for (let i = startIndex; i < endIndex; i++) {
        slots[i] = entry;
      }
    });
    return slots;
  }, [entries]);

  const initials = `${agent.firstName[0]}${agent.lastName[0]}`.toUpperCase();

  return (
    <div className="flex border-b hover:bg-gray-50/50 relative" style={{ height: "48px" }}>
      {/* Agent info (sticky) */}
      <AgentHoursSummary agent={agent} entries={entries}>
        <div className="sticky left-0 z-20 w-48 flex-shrink-0 bg-white border-r p-2 flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: agent.color || "#4CAF50" }}
          >
            {initials}
          </div>
          <span className="truncate text-sm font-medium">
            {agent.firstName} {agent.lastName}
          </span>
        </div>
      </AgentHoursSummary>

      {/* Time slots container - this is the bounds for react-rnd */}
      <div className="relative flex" style={{ width: `${timeSlots.length * 40}px`, height: "48px" }}>
        {/* Drop zones for each slot (for palette drops) */}
        {timeSlots.map((slot, index) => (
          <DropZone
            key={`${agent.id}-slot-${index}`}
            id={`${agent.id}-slot-${index}`}
            isOccupied={!!occupiedSlots[index]}
            isHighlighted={
              dragOverInfo?.agentId === agent.id && dragOverInfo?.slotIndex === index
            }
            isPasteTarget={pasteTarget?.slotIndex === index}
            hasClipboard={hasClipboard}
            isEvenHour={slot.hour % 2 === 0}
            isHourStart={slot.minute === 0}
            onClick={() => !occupiedSlots[index] && onSlotClick(agent.id, index)}
          />
        ))}

        {/* Resizable entries container - positioned absolutely over drop zones */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ top: "4px", bottom: "4px", height: "40px" }}
        >
          {entries.map(entry => (
            <div key={entry.id} className="pointer-events-auto">
              <ResizableActivityBlock
                entry={entry}
                isSelected={selectedEntryId === entry.id}
                onSelect={onEntrySelect}
                onMove={onEntryMove}
                onResize={onEntryResize}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Individual drop zone for each time slot (for palette drops)
function DropZone({
  id,
  isOccupied,
  isHighlighted,
  isPasteTarget,
  hasClipboard,
  isEvenHour,
  isHourStart,
  onClick,
}: {
  id: string;
  isOccupied: boolean;
  isHighlighted: boolean;
  isPasteTarget: boolean;
  hasClipboard: boolean;
  isEvenHour: boolean;
  isHourStart: boolean;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isOccupied,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`w-10 h-full flex-shrink-0 border-r transition-colors ${
        isHourStart ? "border-r-gray-300" : "border-r-gray-200"
      } ${isEvenHour ? "bg-transparent" : "bg-gray-50/30"} ${
        isOver || isHighlighted
          ? "bg-blue-100"
          : ""
      } ${isPasteTarget ? "bg-green-200 ring-2 ring-green-500 ring-inset" : ""} ${
        isOccupied ? "" : hasClipboard ? "hover:bg-green-100 cursor-cell" : "hover:bg-blue-50 cursor-pointer"
      }`}
      style={{ minWidth: "40px" }}
      title={isPasteTarget ? "Press Ctrl+V to paste here" : hasClipboard && !isOccupied ? "Click to select paste location" : undefined}
    />
  );
}
