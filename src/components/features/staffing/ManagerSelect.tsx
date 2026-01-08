"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useAgents } from "@/hooks/useAgents";

interface ManagerSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  excludeId?: string; // Exclude current employee from list (can't report to self)
  disabled?: boolean;
}

export function ManagerSelect({
  value,
  onChange,
  excludeId,
  disabled = false,
}: ManagerSelectProps) {
  const { data: agents, isLoading } = useAgents();

  // Filter out the current employee and inactive employees
  const availableManagers = agents?.filter(
    (agent) => agent.id !== excludeId && agent.isActive
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <Select
      value={value || "none"}
      onValueChange={(val) => onChange(val === "none" ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Select manager" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No manager</SelectItem>
        {availableManagers?.map((agent) => (
          <SelectItem key={agent.id} value={agent.id}>
            {agent.firstName} {agent.lastName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
