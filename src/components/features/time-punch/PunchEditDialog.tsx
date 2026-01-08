"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useUpdatePunch } from "@/hooks/useTimePunchAdmin";
import { AdminTimePunchResponse, PunchType } from "@/types/time-clock";

interface PunchEditDialogProps {
  punch: AdminTimePunchResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function PunchEditDialog({
  punch,
  open,
  onOpenChange,
  onSuccess,
}: PunchEditDialogProps) {
  const [punchTime, setPunchTime] = useState("");
  const [note, setNote] = useState("");

  const updateMutation = useUpdatePunch();

  // Reset form when punch changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && punch) {
      // Format datetime for input (YYYY-MM-DDTHH:MM)
      const date = new Date(punch.punchTime);
      const formatted = date.toISOString().slice(0, 16);
      setPunchTime(formatted);
      setNote("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async () => {
    if (!punch || !punchTime || !note.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: punch.id,
        data: {
          punchTime: new Date(punchTime).toISOString(),
          note: note.trim(),
        },
      });
      toast.success("Punch updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update punch");
    }
  };

  if (!punch) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Punch Time</DialogTitle>
          <DialogDescription>
            Update the punch time for {punch.enrollment.agent.firstName}{" "}
            {punch.enrollment.agent.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Punch Type</Label>
            <p className="text-sm font-medium">
              {punch.punchType === PunchType.CLOCK_IN ? "Clock In" : "Clock Out"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Original Time</Label>
            <p className="text-sm text-muted-foreground">
              {new Date(punch.originalPunchTime || punch.punchTime).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="punchTime">New Time</Label>
            <Input
              id="punchTime"
              type="datetime-local"
              value={punchTime}
              onChange={(e) => setPunchTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Reason for Edit *</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this punch time is being changed..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateMutation.isPending || !punchTime || !note.trim()}
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
