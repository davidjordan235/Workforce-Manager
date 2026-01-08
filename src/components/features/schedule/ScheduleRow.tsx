"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Agent } from "@/hooks/useAgents";
import { ExtendedScheduleEntry } from "@/hooks/useSchedule";
import { ActivityType } from "@/hooks/useActivities";
import { ExtendedTimeSlot, getExtendedSlotIndex, MIDNIGHT_SLOT_INDEX } from "@/types/schedule";
import { ResizableActivityBlock } from "./ResizableActivityBlock";
import { AgentHoursSummary } from "./AgentHoursSummary";

interface ScheduleRowProps {
  agent: Agent;
  timeSlots: ExtendedTimeSlot[];
  entries: ExtendedScheduleEntry[];
  activities: ActivityType[];
  baseDate: string;
  dragOverInfo: { agentId: string; slotIndex: number } | null;
  selectedEntryId: string | null;
  pasteTarget: { agentId: string; slotIndex: number } | null;
  hasClipboard: boolean;
  onEntrySelect: (entryId: string) => void;
  onSlotClick: (agentId: string, slotIndex: number) => void;
  onEntryMove: (entryId: string, newStartTime: string, newEndTime: string, newDate?: string) => void;
  onEntryResize: (entryId: string, newStartTime: string, newEndTime: string, newDate?: string) => void;
  onEntryCopy: (entry: ExtendedScheduleEntry) => void;
  onEntryCut: (entry: ExtendedScheduleEntry) => void;
  onEntryDelete: (entryId: string) => void;
}

export function ScheduleRow({
  agent,
  timeSlots,
  entries,
  activities,
  baseDate,
  dragOverInfo,
  selectedEntryId,
  pasteTarget,
  hasClipboard,
  onEntrySelect,
  onSlotClick,
  onEntryMove,
  onEntryResize,
  onEntryCopy,
  onEntryCut,
  onEntryDelete,
}: ScheduleRowProps) {
  // Calculate which slots are occupied by entries (using extended indices)
  const occupiedSlots = useMemo(() => {
    const slots: Record<number, ExtendedScheduleEntry> = {};
    entries.forEach(entry => {
      const startIndex = getExtendedSlotIndex(entry.startTime, entry.date, baseDate, false);
      const endIndex = getExtendedSlotIndex(entry.endTime, entry.date, baseDate, true);
      // Handle entries that end on next day (endIndex > startIndex)
      const actualEnd = endIndex <= startIndex ? endIndex + 48 : endIndex;
      for (let i = startIndex; i < actualEnd && i < timeSlots.length; i++) {
        slots[i] = entry;
      }
    });
    return slots;
  }, [entries, baseDate, timeSlots.length]);

  const initials = `${agent.firstName[0]}${agent.lastName[0]}`.toUpperCase();

  return (
    <div className="flex border-b hover:bg-gray-50/50 relative" style={{ height: "48px" }}>
      {/* Agent info (sticky) */}
      <AgentHoursSummary agent={agent} entries={entries} activities={activities}>
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
            isMidnight={index === MIDNIGHT_SLOT_INDEX}
            isNextDay={index >= MIDNIGHT_SLOT_INDEX}
            onClick={() => !occupiedSlots[index] && onSlotClick(agent.id, index)}
          />
        ))}

        {/* Midnight separator line */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-orange-500/60 pointer-events-none z-30"
          style={{ left: `${MIDNIGHT_SLOT_INDEX * 40}px` }}
        />

        {/* Resizable entries container - positioned absolutely over drop zones */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ top: "4px", bottom: "4px", height: "40px" }}
        >
          {entries.map(entry => (
            <div key={entry.id} className="pointer-events-auto">
              <ResizableActivityBlock
                entry={entry}
                activities={activities}
                baseDate={baseDate}
                totalSlots={timeSlots.length}
                isSelected={selectedEntryId === entry.id}
                onSelect={onEntrySelect}
                onMove={onEntryMove}
                onResize={onEntryResize}
                onCopy={onEntryCopy}
                onCut={onEntryCut}
                onDelete={onEntryDelete}
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
  isMidnight,
  isNextDay,
  onClick,
}: {
  id: string;
  isOccupied: boolean;
  isHighlighted: boolean;
  isPasteTarget: boolean;
  hasClipboard: boolean;
  isEvenHour: boolean;
  isHourStart: boolean;
  isMidnight: boolean;
  isNextDay: boolean;
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
      } ${isNextDay ? "bg-blue-50/30" : isEvenHour ? "bg-transparent" : "bg-gray-50/30"} ${
        isMidnight ? "border-l-4 border-l-orange-500" : ""
      } ${
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
