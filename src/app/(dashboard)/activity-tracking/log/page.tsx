"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Clock,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { useAgents } from "@/hooks/useAgents";
import {
  useActivityLogs,
  useCreateActivityLog,
  useUpdateActivityLog,
  useDeleteActivityLog,
} from "@/hooks/useActivityLogs";
import { ACTIVITY_CATEGORIES, ActivityLogResponse } from "@/types/activity-log";

export default function LogActivityPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<ActivityLogResponse | null>(null);
  const [deletingLog, setDeletingLog] = useState<ActivityLogResponse | null>(null);

  // For now, we'll let users select their agent (in production, this would be based on logged-in user)
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");

  const [formData, setFormData] = useState({
    startTime: "09:00",
    endTime: "10:00",
    description: "",
    category: "",
    notes: "",
  });

  const { data: agents, isLoading: agentsLoading } = useAgents();
  const { data: activityLogs, isLoading: logsLoading } = useActivityLogs({
    agentId: selectedAgentId || undefined,
    startDate: selectedDate,
    endDate: selectedDate,
  });

  const createMutation = useCreateActivityLog();
  const updateMutation = useUpdateActivityLog();
  const deleteMutation = useDeleteActivityLog();

  // Sort logs by start time
  const sortedLogs = useMemo(() => {
    if (!activityLogs) return [];
    return [...activityLogs].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [activityLogs]);

  // Calculate total time for the day
  const totalMinutes = useMemo(() => {
    return sortedLogs.reduce((total, log) => {
      const start = new Date(log.startTime);
      const end = new Date(log.endTime);
      return total + (end.getTime() - start.getTime()) / (1000 * 60);
    }, 0);
  }, [sortedLogs]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const resetForm = () => {
    setFormData({
      startTime: "09:00",
      endTime: "10:00",
      description: "",
      category: "",
      notes: "",
    });
    setEditingLog(null);
  };

  const handleOpenForm = (log?: ActivityLogResponse) => {
    if (log) {
      setEditingLog(log);
      setFormData({
        startTime: format(new Date(log.startTime), "HH:mm"),
        endTime: format(new Date(log.endTime), "HH:mm"),
        description: log.description,
        category: log.category || "",
        notes: log.notes || "",
      });
    } else {
      resetForm();
      // Set start time to end of last entry if exists
      if (sortedLogs.length > 0) {
        const lastLog = sortedLogs[sortedLogs.length - 1];
        const lastEndTime = format(new Date(lastLog.endTime), "HH:mm");
        setFormData((prev) => ({
          ...prev,
          startTime: lastEndTime,
          endTime: lastEndTime,
        }));
      }
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAgentId) {
      toast.error("Please select an employee first");
      return;
    }

    try {
      const data = {
        agentId: selectedAgentId,
        date: selectedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        description: formData.description,
        category: formData.category || null,
        notes: formData.notes || null,
      };

      if (editingLog) {
        await updateMutation.mutateAsync({
          id: editingLog.id,
          data,
        });
        toast.success("Activity updated successfully");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Activity logged successfully");
      }
      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save activity");
    }
  };

  const handleDelete = async () => {
    if (!deletingLog) return;
    try {
      await deleteMutation.mutateAsync(deletingLog.id);
      toast.success("Activity deleted successfully");
      setDeletingLog(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete activity");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Log Activity" />

      <div className="flex-1 p-6 overflow-auto">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Label htmlFor="agent" className="whitespace-nowrap">Employee:</Label>
            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.firstName} {agent.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="date" className="whitespace-nowrap">Date:</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-[160px]"
            />
          </div>

          <div className="flex-1" />

          <Button onClick={() => handleOpenForm()} disabled={!selectedAgentId}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </div>

        {/* Summary Card */}
        {selectedAgentId && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {format(parseISO(selectedDate), "EEEE, MMMM d, yyyy")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Total Time</p>
                  <p className="text-2xl font-bold">{formatDuration(totalMinutes)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activities</p>
                  <p className="text-2xl font-bold">{sortedLogs.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Timeline */}
        {!selectedAgentId ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                Select an employee to view and log activities
              </p>
            </CardContent>
          </Card>
        ) : logsLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                No activities logged for this day. Click &quot;Add Activity&quot; to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedLogs.map((log) => {
              const startTime = new Date(log.startTime);
              const endTime = new Date(log.endTime);
              const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);

              return (
                <Card key={log.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="text-center min-w-[80px]">
                          <p className="text-sm font-medium">
                            {format(startTime, "h:mm a")}
                          </p>
                          <p className="text-xs text-muted-foreground">to</p>
                          <p className="text-sm font-medium">
                            {format(endTime, "h:mm a")}
                          </p>
                        </div>
                        <div className="border-l pl-4">
                          <p className="font-medium">{log.description}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {log.category && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                {log.category}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(duration)}
                            </span>
                          </div>
                          {log.notes && (
                            <p className="text-sm text-muted-foreground mt-2">
                              {log.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenForm(log)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingLog(log)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLog ? "Edit Activity" : "Log Activity"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">What did you work on?</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g., Morning Standup, Work on Jira Tickets"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (optional)</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingLog
                  ? "Update"
                  : "Log Activity"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingLog}
        onOpenChange={(open) => !open && setDeletingLog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this activity? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingLog(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
