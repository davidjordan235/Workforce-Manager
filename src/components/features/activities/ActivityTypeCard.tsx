"use client";

import { MockActivityType } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Lock } from "lucide-react";
import { categoryLabels } from "@/types/activity";

interface ActivityTypeCardProps {
  activity: MockActivityType;
  onEdit: (activity: MockActivityType) => void;
  onDelete: (activity: MockActivityType) => void;
}

export function ActivityTypeCard({
  activity,
  onEdit,
  onDelete,
}: ActivityTypeCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
      {/* Color Preview */}
      <div
        className="w-14 h-14 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{
          backgroundColor: activity.color,
          color: activity.textColor,
        }}
      >
        {activity.shortName}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">{activity.name}</h3>
          {activity.isSystemType && (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {activity.description || "No description"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {categoryLabels[activity.category]}
          </Badge>
          {activity.isPaid && (
            <Badge variant="outline" className="text-xs">
              Paid
            </Badge>
          )}
          {activity.countsAsWorking && (
            <Badge variant="outline" className="text-xs">
              Working
            </Badge>
          )}
          {!activity.isActive && (
            <Badge variant="destructive" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(activity)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          {!activity.isSystemType && (
            <DropdownMenuItem
              onClick={() => onDelete(activity)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
