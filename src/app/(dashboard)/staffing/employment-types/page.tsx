"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Briefcase, Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useEmploymentTypes,
  useCreateEmploymentType,
  useUpdateEmploymentType,
  useDeleteEmploymentType,
} from "@/hooks/useEmploymentTypes";
import { EmploymentTypeInput, EmploymentTypeResponse } from "@/types/employee";

export default function EmploymentTypesPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<EmploymentTypeResponse | null>(null);
  const [deletingType, setDeletingType] = useState<EmploymentTypeResponse | null>(null);

  const [formData, setFormData] = useState<EmploymentTypeInput>({
    name: "",
    description: "",
  });

  const { data: employmentTypes, isLoading, error } = useEmploymentTypes(false);
  const createMutation = useCreateEmploymentType();
  const updateMutation = useUpdateEmploymentType();
  const deleteMutation = useDeleteEmploymentType();

  const resetForm = () => {
    setFormData({ name: "", description: "" });
    setEditingType(null);
  };

  const handleOpenForm = (type?: EmploymentTypeResponse) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        description: type.description || "",
      });
    } else {
      resetForm();
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingType) {
        await updateMutation.mutateAsync({
          id: editingType.id,
          data: formData,
        });
        toast.success("Employment type updated successfully");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Employment type created successfully");
      }
      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save employment type");
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;
    try {
      await deleteMutation.mutateAsync(deletingType.id);
      toast.success("Employment type deleted successfully");
      setDeletingType(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete employment type");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Employment Types" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Employment Type Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage employment classifications (Full-time, Part-time, Contractor, etc.)
            </p>
          </div>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Employment Type
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
                Failed to load employment types. Please try again.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                All Employment Types ({employmentTypes?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {employmentTypes && employmentTypes.length > 0 ? (
                <div className="grid gap-3">
                  {employmentTypes.map((type) => (
                    <div
                      key={type.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        !type.isActive ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Briefcase className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{type.name}</span>
                            {!type.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                                Inactive
                              </span>
                            )}
                          </div>
                          {type.description && (
                            <p className="text-sm text-muted-foreground">
                              {type.description}
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
                          <DropdownMenuItem onClick={() => handleOpenForm(type)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingType(type)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No employment types found. Create one to get started.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Employment Type" : "Add Employment Type"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Full-time"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this employment type"
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
                  : editingType
                  ? "Update"
                  : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={!!deletingType}
        onOpenChange={(open) => !open && setDeletingType(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employment Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingType?.name}&quot;?
              <span className="block mt-2 text-sm">
                If employees are assigned this type, it will be deactivated instead of deleted.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingType(null)}
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
