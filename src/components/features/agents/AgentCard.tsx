"use client";

import { format } from "date-fns";
import { MockAgent } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Mail, Phone, Calendar } from "lucide-react";

interface AgentCardProps {
  agent: MockAgent;
  onEdit: (agent: MockAgent) => void;
  onDelete: (agent: MockAgent) => void;
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const initials = `${agent.firstName[0]}${agent.lastName[0]}`.toUpperCase();

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-white hover:shadow-md transition-shadow">
      {/* Avatar */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ backgroundColor: agent.color || "#4CAF50" }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold truncate">
            {agent.firstName} {agent.lastName}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {agent.employeeId}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3" />
            {agent.email}
          </span>
          {agent.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {agent.phone}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(agent.hireDate), "MMM d, yyyy")}
          </span>
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
          <DropdownMenuItem onClick={() => onEdit(agent)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(agent)}
            className="text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
