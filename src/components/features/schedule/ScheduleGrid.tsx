"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { MockScheduleEntry, MockActivityType, mockActivityTypes } from "@/lib/mock-data";
import { useScheduleByDate, useMoveScheduleEntry, useCreateScheduleEntry, useUpdateScheduleEntry, useDeleteScheduleEntry } from "@/hooks/useSchedule";
import { useAgents } from "@/hooks/useAgents";
import { generateTimeSlots, getTimeSlotIndex, getTimeFromSlotIndex } from "@/types/schedule";
import { TimeHeader } from "./TimeHeader";
import { ScheduleRow } from "./ScheduleRow";
import { StaffingTotals } from "./StaffingTotals";
import { ActivityPalette } from "./ActivityPalette";
import { Loader2 } from "lucide-react";

interface ScheduleGridProps {
  date: Date;
}

export function ScheduleGrid({ date }: ScheduleGridProps) {
  const dateString = format(date, "yyyy-MM-dd");
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const { data: scheduleEntries, isLoading: scheduleLoading } = useScheduleByDate(dateString);
  const { data: agents, isLoading: agentsLoading } = useAgents();
  const moveMutation = useMoveScheduleEntry();
  const createMutation = useCreateScheduleEntry();
  const updateMutation = useUpdateScheduleEntry();
  const deleteMutation = useDeleteScheduleEntry();

  const [activeActivity, setActiveActivity] = useState<MockActivityType | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ agentId: string; slotIndex: number } | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [pasteTarget, setPasteTarget] = useState<{ agentId: string; slotIndex: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ entry: MockScheduleEntry; isCut: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Group schedule entries by agent
  const entriesByAgent = useMemo(() => {
    const map: Record<string, MockScheduleEntry[]> = {};
    scheduleEntries?.forEach(entry => {
      if (!map[entry.agentId]) {
        map[entry.agentId] = [];
      }
      map[entry.agentId].push(entry);
    });
    return map;
  }, [scheduleEntries]);

  // Handle keyboard events for delete, cut, copy, paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected entry
      if ((e.key === "Delete" || e.key === "Backspace") && selectedEntryId) {
        e.preventDefault();
        deleteMutation.mutate(selectedEntryId);
        setSelectedEntryId(null);
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedEntryId(null);
        setPasteTarget(null);
      }

      // Copy (Ctrl+C)
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedEntryId) {
        e.preventDefault();
        const entry = scheduleEntries?.find(ent => ent.id === selectedEntryId);
        if (entry) {
          setClipboard({ entry, isCut: false });
        }
      }

      // Cut (Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && e.key === "x" && selectedEntryId) {
        e.preventDefault();
        const entry = scheduleEntries?.find(ent => ent.id === selectedEntryId);
        if (entry) {
          setClipboard({ entry, isCut: true });
        }
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard && pasteTarget) {
        e.preventDefault();
        const { entry, isCut } = clipboard;
        const duration = getTimeSlotIndex(entry.endTime) - getTimeSlotIndex(entry.startTime);
        const newEndSlotIndex = Math.min(pasteTarget.slotIndex + duration, 48);
        const newStartTime = getTimeFromSlotIndex(pasteTarget.slotIndex);
        const newEndTime = getTimeFromSlotIndex(newEndSlotIndex);

        // Create new entry at paste target
        createMutation.mutate({
          agentId: pasteTarget.agentId,
          activityTypeId: entry.activityTypeId,
          date: dateString,
          startTime: newStartTime,
          endTime: newEndTime,
        });

        // If cut, delete the original
        if (isCut) {
          deleteMutation.mutate(entry.id);
          setClipboard(null);
        }

        setPasteTarget(null);
        setSelectedEntryId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEntryId, clipboard, pasteTarget, scheduleEntries, deleteMutation, createMutation, dateString]);

  // Click outside to deselect
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking on the container itself, not on an activity
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-schedule-grid]")) {
      setSelectedEntryId(null);
    }
  }, []);

  // Handle entry selection
  const handleEntrySelect = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    setPasteTarget(null); // Clear paste target when selecting an entry
  }, []);

  // Handle slot click (for paste target)
  const handleSlotClick = useCallback((agentId: string, slotIndex: number) => {
    setPasteTarget({ agentId, slotIndex });
    setSelectedEntryId(null); // Clear entry selection when selecting paste target
  }, []);

  // Handle entry move (within same row, using react-rnd)
  const handleEntryMove = useCallback(
    (entryId: string, newStartTime: string, newEndTime: string) => {
      const entry = scheduleEntries?.find(e => e.id === entryId);
      if (!entry) return;

      updateMutation.mutate({
        id: entryId,
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        },
      });
    },
    [scheduleEntries, updateMutation]
  );

  // Handle entry resize (using react-rnd)
  const handleEntryResize = useCallback(
    (entryId: string, newStartTime: string, newEndTime: string) => {
      updateMutation.mutate({
        id: entryId,
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
        },
      });
    },
    [updateMutation]
  );

  // Handle palette drag start (for creating new entries)
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    if (active.id.toString().startsWith("palette-")) {
      const activityId = active.id.toString().replace("palette-", "");
      const activity = mockActivityTypes.find(a => a.id === activityId);
      setActiveActivity(activity || null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && over.id.toString().includes("-slot-")) {
      const [agentId, , slotIndexStr] = over.id.toString().split("-slot-");
      setDragOverInfo({
        agentId: agentId.replace("agent-", ""),
        slotIndex: parseInt(slotIndexStr),
      });
    } else {
      setDragOverInfo(null);
    }
  };

  // Handle palette drop (create new entry)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveActivity(null);
    setDragOverInfo(null);

    if (!over) return;

    const overId = over.id.toString();
    if (!overId.includes("-slot-")) return;

    // Only handle palette drops
    if (!active.id.toString().startsWith("palette-")) return;

    // Parse the drop target
    const parts = overId.split("-slot-");
    const targetAgentId = parts[0];
    const targetSlotIndex = parseInt(parts[1]);
    const targetTime = getTimeFromSlotIndex(targetSlotIndex);

    // Create new entry
    const activityId = active.id.toString().replace("palette-", "");
    const endSlotIndex = Math.min(targetSlotIndex + 2, 48); // Default 1 hour duration
    const endTime = getTimeFromSlotIndex(endSlotIndex);

    createMutation.mutate({
      agentId: targetAgentId,
      activityTypeId: activityId,
      date: dateString,
      startTime: targetTime,
      endTime: endTime,
    });
  };

  if (scheduleLoading || agentsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4">
        {/* Main Grid */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden rounded-lg border bg-white"
          onClick={handleContainerClick}
          data-schedule-grid
        >
          <div className="h-full overflow-auto">
            <div className="min-w-max">
              {/* Time Header */}
              <TimeHeader timeSlots={timeSlots} />

              {/* Agent Rows */}
              <div>
                {agents?.map(agent => (
                  <ScheduleRow
                    key={agent.id}
                    agent={agent}
                    timeSlots={timeSlots}
                    entries={entriesByAgent[agent.id] || []}
                    dragOverInfo={dragOverInfo}
                    selectedEntryId={selectedEntryId}
                    pasteTarget={pasteTarget?.agentId === agent.id ? pasteTarget : null}
                    hasClipboard={!!clipboard}
                    onEntrySelect={handleEntrySelect}
                    onSlotClick={handleSlotClick}
                    onEntryMove={handleEntryMove}
                    onEntryResize={handleEntryResize}
                  />
                ))}
              </div>

              {/* Staffing Totals Footer */}
              <StaffingTotals
                timeSlots={timeSlots}
                entries={scheduleEntries || []}
              />
            </div>
          </div>
        </div>

        {/* Activity Palette */}
        <ActivityPalette />
      </div>

      {/* Drag Overlay for palette items */}
      <DragOverlay>
        {activeActivity && (
          <div
            className="px-3 py-2 rounded text-sm font-medium shadow-lg"
            style={{
              backgroundColor: activeActivity.color,
              color: activeActivity.textColor,
            }}
          >
            {activeActivity.shortName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
