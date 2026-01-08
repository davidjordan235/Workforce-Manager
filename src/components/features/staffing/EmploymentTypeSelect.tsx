"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Loader2 } from "lucide-react";
import { useEmploymentTypes, useCreateEmploymentType } from "@/hooks/useEmploymentTypes";
import { toast } from "sonner";

interface EmploymentTypeSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  allowAdd?: boolean;
  disabled?: boolean;
}

export function EmploymentTypeSelect({
  value,
  onChange,
  allowAdd = true,
  disabled = false,
}: EmploymentTypeSelectProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: employmentTypes, isLoading } = useEmploymentTypes();
  const createMutation = useCreateEmploymentType();

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      const newType = await createMutation.mutateAsync({ name: newName.trim() });
      onChange(newType.id);
      setNewName("");
      setIsAddOpen(false);
      toast.success("Employment type created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create employment type");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Select
        value={value || "none"}
        onValueChange={(val) => onChange(val === "none" ? null : val)}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Select employment type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Not specified</SelectItem>
          {employmentTypes?.map((type) => (
            <SelectItem key={type.id} value={type.id}>
              {type.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allowAdd && (
        <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="end">
            <div className="space-y-3">
              <Label htmlFor="new-type">New Employment Type</Label>
              <Input
                id="new-type"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Full-time"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreate}
                  disabled={!newName.trim() || createMutation.isPending}
                >
                  {createMutation.isPending ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
