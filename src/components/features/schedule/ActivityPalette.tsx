"use client";

import { useDraggable } from "@dnd-kit/core";
import { ActivityType } from "@/hooks/useActivities";
import { GripVertical } from "lucide-react";

interface ActivityPaletteProps {
  activities: ActivityType[];
}

export function ActivityPalette({ activities }: ActivityPaletteProps) {
  // Group activities by category
  const groupedActivities = activities.reduce((acc, activity) => {
    if (!acc[activity.category]) {
      acc[activity.category] = [];
    }
    acc[activity.category].push(activity);
    return acc;
  }, {} as Record<string, ActivityType[]>);

  const categoryLabels: Record<string, string> = {
    WORK: "Work",
    BREAK: "Breaks",
    TRAINING: "Training",
    MEETING: "Meetings",
    PROJECT: "Projects",
    TIME_OFF: "Time Off",
    CUSTOM: "Custom",
  };

  const categoryOrder = ["WORK", "BREAK", "TRAINING", "MEETING", "PROJECT", "TIME_OFF", "CUSTOM"];

  return (
    <div className="w-48 flex-shrink-0 bg-white rounded-lg border p-3 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Activities</h3>
      <p className="text-xs text-gray-500 mb-4">
        Drag activities onto the schedule
      </p>

      <div className="space-y-4">
        {categoryOrder.map(category => {
          const activities = groupedActivities[category];
          if (!activities || activities.length === 0) return null;

          return (
            <div key={category}>
              <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                {categoryLabels[category]}
              </h4>
              <div className="space-y-1">
                {activities.map(activity => (
                  <DraggableActivity key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DraggableActivity({ activity }: { activity: ActivityType }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${activity.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-50" : "opacity-100"
      }`}
      style={{
        backgroundColor: activity.color,
        color: activity.textColor,
      }}
      {...listeners}
      {...attributes}
    >
      <GripVertical className="h-3 w-3 opacity-60" />
      <span className="text-xs font-medium truncate">{activity.shortName}</span>
      <span className="text-[10px] opacity-75 truncate flex-1">{activity.name}</span>
    </div>
  );
}
