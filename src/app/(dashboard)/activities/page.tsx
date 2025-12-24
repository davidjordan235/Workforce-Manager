"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Palette, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useActivities,
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  groupActivitiesByCategory,
} from "@/hooks/useActivities";
import { ActivityTypeForm } from "@/components/features/activities/ActivityTypeForm";
import { ActivityTypeCard } from "@/components/features/activities/ActivityTypeCard";
import { ActivityTypeInput, categoryLabels } from "@/types/activity";
import { MockActivityType } from "@/lib/mock-data";

export default function ActivitiesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<MockActivityType | null>(null);
  const [deletingActivity, setDeletingActivity] = useState<MockActivityType | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: activities, isLoading, error } = useActivities();
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();

  const handleCreate = async (data: ActivityTypeInput) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success("Activity type created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create activity type");
      throw error;
    }
  };

  const handleUpdate = async (data: ActivityTypeInput) => {
    if (!editingActivity) return;
    try {
      await updateMutation.mutateAsync({ id: editingActivity.id, data });
      toast.success("Activity type updated successfully");
      setEditingActivity(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update activity type");
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!deletingActivity) return;
    try {
      await deleteMutation.mutateAsync(deletingActivity.id);
      toast.success("Activity type deleted successfully");
      setDeletingActivity(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete activity type");
    }
  };

  const handleEdit = (activity: MockActivityType) => {
    setEditingActivity(activity);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingActivity(null);
    }
  };

  const groupedActivities = activities ? groupActivitiesByCategory(activities) : null;

  const filteredActivities = activeTab === "all"
    ? activities
    : activities?.filter((a) => a.category === activeTab);

  return (
    <div className="flex flex-col h-full">
      <Header title="Activity Types" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Activity Type Management</h2>
            <p className="text-sm text-muted-foreground">
              Configure the types of activities that can be scheduled
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Activity Type
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-8">
              <p className="text-center text-red-500">
                Failed to load activity types. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({activities?.length || 0})
              </TabsTrigger>
              {Object.entries(categoryLabels).map(([key, label]) => {
                const count = groupedActivities?.[key]?.length || 0;
                if (count === 0) return null;
                return (
                  <TabsTrigger key={key} value={key}>
                    {label} ({count})
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    {activeTab === "all"
                      ? "All Activity Types"
                      : categoryLabels[activeTab as keyof typeof categoryLabels]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {filteredActivities && filteredActivities.length > 0 ? (
                    <div className="grid gap-4">
                      {filteredActivities.map((activity) => (
                        <ActivityTypeCard
                          key={activity.id}
                          activity={activity}
                          onEdit={handleEdit}
                          onDelete={setDeletingActivity}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No activity types found in this category.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create/Edit Form */}
      <ActivityTypeForm
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        activityType={editingActivity}
        onSubmit={editingActivity ? handleUpdate : handleCreate}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingActivity}
        onOpenChange={(open) => !open && setDeletingActivity(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Activity Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingActivity?.name}&quot;?
              {deletingActivity && (
                <span className="block mt-2 text-sm">
                  If this activity type is in use, it will be deactivated instead
                  of deleted.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingActivity(null)}
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
