"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActivityType } from "@/hooks/useActivities";
import { Agent } from "@/hooks/useAgents";
import { isOvernightShift, getSlotSpan } from "@/types/schedule";
import { Moon } from "lucide-react";

interface ScheduleEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agents: Agent[];
  activities: ActivityType[];
  date: string;
  onSubmit: (data: {
    agentId: string;
    activityTypeId: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  isLoading?: boolean;
  // Pre-fill values for editing or quick creation
  defaultAgentId?: string;
  defaultActivityId?: string;
  defaultStartTime?: string;
  defaultEndTime?: string;
}

// Generate time options in 30-minute intervals
function generateTimeOptions() {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      options.push(
        `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
      );
    }
  }
  return options;
}

const timeOptions = generateTimeOptions();

// Format time for display (e.g., "08:00" -> "8:00 AM")
function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function ScheduleEntryDialog({
  open,
  onOpenChange,
  agents,
  activities,
  date,
  onSubmit,
  isLoading = false,
  defaultAgentId,
  defaultActivityId,
  defaultStartTime = "09:00",
  defaultEndTime = "17:00",
}: ScheduleEntryDialogProps) {
  const [agentId, setAgentId] = useState(defaultAgentId || "");
  const [activityTypeId, setActivityTypeId] = useState(defaultActivityId || "");
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(defaultEndTime);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setAgentId(defaultAgentId || "");
      setActivityTypeId(defaultActivityId || "");
      setStartTime(defaultStartTime);
      setEndTime(defaultEndTime);
    }
  }, [open, defaultAgentId, defaultActivityId, defaultStartTime, defaultEndTime]);

  const isOvernight = isOvernightShift(startTime, endTime);
  const duration = getSlotSpan(startTime, endTime);
  const durationHours = (duration * 30) / 60;

  const handleSubmit = async () => {
    if (!agentId || !activityTypeId) return;

    await onSubmit({
      agentId,
      activityTypeId,
      startTime,
      endTime,
    });

    onOpenChange(false);
  };

  const selectedActivity = activities.find((a) => a.id === activityTypeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Schedule Entry</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Agent Selection */}
          <div className="grid gap-2">
            <Label htmlFor="agent">Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: agent.color || "#4CAF50" }}
                      />
                      {agent.firstName} {agent.lastName}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activity Selection */}
          <div className="grid gap-2">
            <Label htmlFor="activity">Activity</Label>
            <Select value={activityTypeId} onValueChange={setActivityTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                {activities.map((activity) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: activity.color }}
                      />
                      {activity.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endTime">End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {timeOptions.map((time) => (
                    <SelectItem key={time} value={time}>
                      {formatTimeDisplay(time)}
                      {isOvernightShift(startTime, time) && " (+1 day)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration and Overnight Indicator */}
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              Duration: <span className="font-medium text-foreground">{durationHours} hours</span>
            </div>
            {isOvernight && (
              <div className="flex items-center gap-1 text-purple-600">
                <Moon className="h-4 w-4" />
                <span className="font-medium">Overnight shift</span>
              </div>
            )}
          </div>

          {/* Preview */}
          {selectedActivity && (
            <div
              className="p-3 rounded-md text-sm"
              style={{
                backgroundColor: selectedActivity.color,
                color: selectedActivity.textColor,
              }}
            >
              <div className="font-medium">{selectedActivity.name}</div>
              <div className="opacity-80">
                {formatTimeDisplay(startTime)} - {formatTimeDisplay(endTime)}
                {isOvernight && " (next day)"}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!agentId || !activityTypeId || isLoading}
          >
            {isLoading ? "Creating..." : "Create Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
