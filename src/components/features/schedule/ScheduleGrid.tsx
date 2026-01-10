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
import { format, addDays } from "date-fns";
import { useScheduleExtended, useMoveScheduleEntry, useCreateScheduleEntry, useUpdateScheduleEntry, useDeleteScheduleEntry, ExtendedScheduleEntry, ScheduleEntry } from "@/hooks/useSchedule";
import { useAgents } from "@/hooks/useAgents";
import { useActivities, ActivityType } from "@/hooks/useActivities";
import { useClockStatus } from "@/hooks/useClockStatus";
import { generateExtendedTimeSlots, getTimeAndDateFromExtendedIndex, getSlotSpan, EXTENDED_SLOTS } from "@/types/schedule";
import { TimeHeader } from "./TimeHeader";
import { ScheduleRow } from "./ScheduleRow";
import { StaffingTotals } from "./StaffingTotals";
import { ActivityPalette } from "./ActivityPalette";
import { ScheduleEntryDialog } from "./ScheduleEntryDialog";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Loader2, Plus, CircleDot } from "lucide-react";

interface ScheduleGridProps {
  date: Date;
  departmentId?: string;
}

export function ScheduleGrid({ date, departmentId }: ScheduleGridProps) {
  const dateString = format(date, "yyyy-MM-dd");
  const nextDate = addDays(date, 1);
  const nextDateLabel = format(nextDate, "M/d");
  const timeSlots = useMemo(() => generateExtendedTimeSlots(), []);

  const { data: extendedData, isLoading: scheduleLoading } = useScheduleExtended(dateString);
  const { data: agents, isLoading: agentsLoading } = useAgents(undefined, departmentId);
  const { data: activities, isLoading: activitiesLoading } = useActivities();
  const { data: clockStatus } = useClockStatus();
  const moveMutation = useMoveScheduleEntry();
  const createMutation = useCreateScheduleEntry();
  const updateMutation = useUpdateScheduleEntry();
  const deleteMutation = useDeleteScheduleEntry();

  const [activeActivity, setActiveActivity] = useState<ActivityType | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ agentId: string; slotIndex: number } | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [pasteTarget, setPasteTarget] = useState<{ agentId: string; slotIndex: number } | null>(null);
  const [clipboard, setClipboard] = useState<{ entry: ExtendedScheduleEntry; isCut: boolean } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showOnlyClockedIn, setShowOnlyClockedIn] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Get schedule entries from extended data
  const allScheduleEntries = extendedData?.entries ?? [];

  // Get agent IDs for the current view (filtered by department if applicable)
  const agentIds = useMemo(() => new Set(agents?.map(a => a.id) || []), [agents]);

  // Filter agents by clock-in status if enabled
  const filteredAgents = useMemo(() => {
    if (!agents) return [];
    if (!showOnlyClockedIn) return agents;
    return agents.filter(agent => clockStatus?.[agent.id]?.isClockedIn);
  }, [agents, showOnlyClockedIn, clockStatus]);

  // Count of clocked-in employees
  const clockedInCount = useMemo(() => {
    if (!agents || !clockStatus) return 0;
    return agents.filter(agent => clockStatus[agent.id]?.isClockedIn).length;
  }, [agents, clockStatus]);

  // Filter schedule entries to only include those for displayed agents
  const scheduleEntries = useMemo(() => {
    if (!departmentId) return allScheduleEntries; // Show all if no department filter
    return allScheduleEntries.filter(entry => agentIds.has(entry.agentId));
  }, [allScheduleEntries, agentIds, departmentId]);

  // Group schedule entries by agent
  const entriesByAgent = useMemo(() => {
    const map: Record<string, ExtendedScheduleEntry[]> = {};
    scheduleEntries.forEach(entry => {
      if (!map[entry.agentId]) {
        map[entry.agentId] = [];
      }
      map[entry.agentId].push(entry);
    });
    return map;
  }, [scheduleEntries]);

  // Handle keyboard events for delete, cut, copy, paste, and activity shortcuts
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
        const entry = scheduleEntries.find(ent => ent.id === selectedEntryId);
        if (entry) {
          setClipboard({ entry, isCut: false });
        }
      }

      // Cut (Ctrl+X)
      if ((e.ctrlKey || e.metaKey) && e.key === "x" && selectedEntryId) {
        e.preventDefault();
        const entry = scheduleEntries.find(ent => ent.id === selectedEntryId);
        if (entry) {
          setClipboard({ entry, isCut: true });
        }
      }

      // Paste (Ctrl+V)
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboard && pasteTarget) {
        e.preventDefault();
        const { entry, isCut } = clipboard;
        // Use getSlotSpan which handles overnight shifts correctly
        const duration = getSlotSpan(entry.startTime, entry.endTime);
        const newEndSlotIndex = Math.min(pasteTarget.slotIndex + duration, EXTENDED_SLOTS);

        // Get time and date from extended slot indices
        const { time: newStartTime, date: newStartDate } = getTimeAndDateFromExtendedIndex(pasteTarget.slotIndex, dateString);
        const { time: newEndTime } = getTimeAndDateFromExtendedIndex(newEndSlotIndex, dateString);

        // Create new entry at paste target
        createMutation.mutate({
          agentId: pasteTarget.agentId,
          activityTypeId: entry.activityTypeId,
          date: newStartDate,
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

      // Activity shortcut: press first letter of activity name to fill slot
      if (pasteTarget && activities && e.key.length === 1 && /[a-zA-Z]/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const pressedKey = e.key.toLowerCase();
        const matchingActivities = activities.filter(a =>
          a.name.toLowerCase().startsWith(pressedKey)
        );

        if (matchingActivities.length > 0) {
          e.preventDefault();
          const activity = matchingActivities[0]; // Use first match
          const endSlotIndex = Math.min(pasteTarget.slotIndex + 2, EXTENDED_SLOTS); // Default 1 hour

          const { time: startTime, date: startDate } = getTimeAndDateFromExtendedIndex(pasteTarget.slotIndex, dateString);
          const { time: endTime } = getTimeAndDateFromExtendedIndex(endSlotIndex, dateString);

          createMutation.mutate({
            agentId: pasteTarget.agentId,
            activityTypeId: activity.id,
            date: startDate,
            startTime: startTime,
            endTime: endTime,
          });

          setPasteTarget(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEntryId, clipboard, pasteTarget, scheduleEntries, activities, deleteMutation, createMutation, dateString]);

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

  // Handle entry move (within same row, using react-rnd) - now with optional date
  const handleEntryMove = useCallback(
    (entryId: string, newStartTime: string, newEndTime: string, newDate?: string) => {
      const entry = scheduleEntries.find(e => e.id === entryId);
      if (!entry) return;

      updateMutation.mutate({
        id: entryId,
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          ...(newDate && { date: newDate }),
        },
      });
    },
    [scheduleEntries, updateMutation]
  );

  // Handle entry resize (using react-rnd) - now with optional date
  const handleEntryResize = useCallback(
    (entryId: string, newStartTime: string, newEndTime: string, newDate?: string) => {
      updateMutation.mutate({
        id: entryId,
        data: {
          startTime: newStartTime,
          endTime: newEndTime,
          ...(newDate && { date: newDate }),
        },
      });
    },
    [updateMutation]
  );

  // Handle entry copy (from context menu)
  const handleEntryCopy = useCallback(
    (entry: ExtendedScheduleEntry) => {
      setClipboard({ entry, isCut: false });
      setSelectedEntryId(entry.id);
    },
    []
  );

  // Handle entry cut (from context menu)
  const handleEntryCut = useCallback(
    (entry: ExtendedScheduleEntry) => {
      setClipboard({ entry, isCut: true });
      setSelectedEntryId(entry.id);
    },
    []
  );

  // Handle entry delete (from context menu)
  const handleEntryDelete = useCallback(
    (entryId: string) => {
      deleteMutation.mutate(entryId);
      setSelectedEntryId(null);
    },
    [deleteMutation]
  );

  // Handle dialog submit for creating entries (supports overnight shifts)
  const handleDialogSubmit = useCallback(
    async (data: { agentId: string; activityTypeId: string; startTime: string; endTime: string }) => {
      await createMutation.mutateAsync({
        agentId: data.agentId,
        activityTypeId: data.activityTypeId,
        date: dateString,
        startTime: data.startTime,
        endTime: data.endTime,
      });
    },
    [createMutation, dateString]
  );

  // Handle palette drag start (for creating new entries)
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;

    if (active.id.toString().startsWith("palette-")) {
      const activityId = active.id.toString().replace("palette-", "");
      const activity = activities?.find(a => a.id === activityId);
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

    // Get time and date from extended slot index
    const { time: targetTime, date: targetDate } = getTimeAndDateFromExtendedIndex(targetSlotIndex, dateString);

    // Create new entry
    const activityId = active.id.toString().replace("palette-", "");
    const endSlotIndex = Math.min(targetSlotIndex + 2, EXTENDED_SLOTS); // Default 1 hour duration
    const { time: endTime } = getTimeAndDateFromExtendedIndex(endSlotIndex, dateString);

    createMutation.mutate({
      agentId: targetAgentId,
      activityTypeId: activityId,
      date: targetDate,
      startTime: targetTime,
      endTime: endTime,
    });
  };

  if (scheduleLoading || agentsLoading || activitiesLoading) {
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
              <TimeHeader timeSlots={timeSlots} nextDateLabel={nextDateLabel} />

              {/* Agent Rows */}
              <div>
                {filteredAgents.map(agent => (
                  <ScheduleRow
                    key={agent.id}
                    agent={agent}
                    timeSlots={timeSlots}
                    entries={entriesByAgent[agent.id] || []}
                    activities={activities || []}
                    baseDate={dateString}
                    dragOverInfo={dragOverInfo}
                    selectedEntryId={selectedEntryId}
                    pasteTarget={pasteTarget?.agentId === agent.id ? pasteTarget : null}
                    hasClipboard={!!clipboard}
                    isClockedIn={clockStatus?.[agent.id]?.isClockedIn}
                    onEntrySelect={handleEntrySelect}
                    onSlotClick={handleSlotClick}
                    onEntryMove={handleEntryMove}
                    onEntryResize={handleEntryResize}
                    onEntryCopy={handleEntryCopy}
                    onEntryCut={handleEntryCut}
                    onEntryDelete={handleEntryDelete}
                  />
                ))}
              </div>

              {/* Staffing Totals Footer */}
              <StaffingTotals
                timeSlots={timeSlots}
                entries={scheduleEntries}
                activities={activities || []}
                baseDate={dateString}
              />
            </div>
          </div>
        </div>

        {/* Activity Palette and Add Button */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
          <Toggle
            pressed={showOnlyClockedIn}
            onPressedChange={setShowOnlyClockedIn}
            className="w-full justify-start gap-2"
            aria-label="Show only clocked in"
          >
            <CircleDot className={`h-4 w-4 ${showOnlyClockedIn ? "text-green-500" : ""}`} />
            <span className="text-sm">Clocked In ({clockedInCount})</span>
          </Toggle>
          <ActivityPalette activities={activities || []} />
        </div>
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

      {/* Add Entry Dialog (supports overnight shifts) */}
      <ScheduleEntryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        agents={agents || []}
        activities={activities || []}
        date={dateString}
        onSubmit={handleDialogSubmit}
        isLoading={createMutation.isPending}
      />
    </DndContext>
  );
}
