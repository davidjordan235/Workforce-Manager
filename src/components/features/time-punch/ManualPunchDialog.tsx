"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useCreateManualPunch } from "@/hooks/useTimePunchAdmin";
import { useTechEnrollments } from "@/hooks/useTechEnrollment";
import { PunchType } from "@/types/time-clock";

interface ManualPunchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  preselectedEnrollmentId?: string;
}

export function ManualPunchDialog({
  open,
  onOpenChange,
  onSuccess,
  preselectedEnrollmentId,
}: ManualPunchDialogProps) {
  const [enrollmentId, setEnrollmentId] = useState("");
  const [punchType, setPunchType] = useState<string>("");
  const [punchTime, setPunchTime] = useState("");
  const [note, setNote] = useState("");

  const { data: enrollments, isLoading: loadingEnrollments } = useTechEnrollments();
  const createMutation = useCreateManualPunch();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setEnrollmentId(preselectedEnrollmentId || "");
      setPunchType("");
      // Default to current time
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setPunchTime(now.toISOString().slice(0, 16));
      setNote("");
    }
  }, [open, preselectedEnrollmentId]);

  const handleSubmit = async () => {
    if (!enrollmentId || !punchType || !punchTime || !note.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      await createMutation.mutateAsync({
        enrollmentId,
        punchType: punchType as typeof PunchType.CLOCK_IN | typeof PunchType.CLOCK_OUT,
        punchTime: new Date(punchTime).toISOString(),
        note: note.trim(),
      });
      toast.success("Manual punch created successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create punch");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Punch</DialogTitle>
          <DialogDescription>
            Create a manual time punch entry. This will be marked as unverified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee">Employee *</Label>
            <Select value={enrollmentId} onValueChange={setEnrollmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee..." />
              </SelectTrigger>
              <SelectContent>
                {loadingEnrollments ? (
                  <div className="p-2 text-center text-muted-foreground">Loading...</div>
                ) : !enrollments?.length ? (
                  <div className="p-2 text-center text-muted-foreground">
                    No enrolled employees
                  </div>
                ) : (
                  enrollments.map((enrollment) => (
                    <SelectItem key={enrollment.id} value={enrollment.id}>
                      {enrollment.agent.firstName} {enrollment.agent.lastName} (
                      {enrollment.agent.employeeId})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="punchType">Punch Type *</Label>
            <Select value={punchType} onValueChange={setPunchType}>
              <SelectTrigger>
                <SelectValue placeholder="Select punch type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PunchType.CLOCK_IN}>Clock In</SelectItem>
                <SelectItem value={PunchType.CLOCK_OUT}>Clock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="punchTime">Date & Time *</Label>
            <Input
              id="punchTime"
              type="datetime-local"
              value={punchTime}
              onChange={(e) => setPunchTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Reason for Manual Entry *</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this punch is being added manually..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Required: Explain why this punch wasn&apos;t recorded normally.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createMutation.isPending ||
              !enrollmentId ||
              !punchType ||
              !punchTime ||
              !note.trim()
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Add Punch"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
