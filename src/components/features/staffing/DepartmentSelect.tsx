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
import { useDepartments, useCreateDepartment } from "@/hooks/useDepartments";
import { toast } from "sonner";

interface DepartmentSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
  allowAdd?: boolean;
  disabled?: boolean;
}

export function DepartmentSelect({
  value,
  onChange,
  allowAdd = true,
  disabled = false,
}: DepartmentSelectProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const { data: departments, isLoading } = useDepartments();
  const createMutation = useCreateDepartment();

  const handleCreate = async () => {
    if (!newName.trim()) return;

    try {
      const newDept = await createMutation.mutateAsync({ name: newName.trim() });
      onChange(newDept.id);
      setNewName("");
      setIsAddOpen(false);
      toast.success("Department created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create department");
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
          <SelectValue placeholder="Select department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No department</SelectItem>
          {departments?.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
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
              <Label htmlFor="new-dept">New Department</Label>
              <Input
                id="new-dept"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Department name"
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
