"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HexColorPicker } from "react-colorful";
import { MockActivityType } from "@/lib/mock-data";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { activityTypeSchema, ActivityTypeInput, categoryLabels } from "@/types/activity";

interface ActivityTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityType?: MockActivityType | null;
  onSubmit: (data: ActivityTypeInput) => Promise<void>;
  isLoading?: boolean;
}

export function ActivityTypeForm({
  open,
  onOpenChange,
  activityType,
  onSubmit,
  isLoading,
}: ActivityTypeFormProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ActivityTypeInput>({
    resolver: zodResolver(activityTypeSchema),
    defaultValues: {
      name: "",
      shortName: "",
      description: "",
      category: "WORK",
      color: "#4CAF50",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: true,
    },
  });

  const color = watch("color");
  const textColor = watch("textColor");
  const category = watch("category");

  // Reset form when activity type changes
  useEffect(() => {
    if (activityType) {
      reset({
        name: activityType.name,
        shortName: activityType.shortName,
        description: activityType.description || "",
        category: activityType.category,
        color: activityType.color,
        textColor: activityType.textColor,
        isPaid: activityType.isPaid,
        countsAsWorking: activityType.countsAsWorking,
      });
    } else {
      reset({
        name: "",
        shortName: "",
        description: "",
        category: "CUSTOM",
        color: "#4CAF50",
        textColor: "#FFFFFF",
        isPaid: true,
        countsAsWorking: true,
      });
    }
  }, [activityType, reset]);

  const handleFormSubmit = async (data: ActivityTypeInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {activityType ? "Edit Activity Type" : "Create Activity Type"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g., Working, Lunch, Training"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Short Name */}
          <div className="space-y-2">
            <Label htmlFor="shortName">Short Name (3-4 characters)</Label>
            <Input
              id="shortName"
              {...register("shortName")}
              placeholder="e.g., WRK, LCH, TRN"
              maxLength={4}
              className="uppercase"
            />
            {errors.shortName && (
              <p className="text-sm text-red-500">{errors.shortName.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="Brief description of this activity"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) =>
                setValue("category", value as MockActivityType["category"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            {/* Background Color */}
            <div className="space-y-2">
              <Label>Background Color</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-full h-10 rounded-md border flex items-center gap-2 px-3"
                >
                  <div
                    className="w-6 h-6 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm">{color}</span>
                </button>
                {showColorPicker && (
                  <div className="absolute z-50 mt-2">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowColorPicker(false)}
                    />
                    <div className="relative bg-white p-3 rounded-lg shadow-lg border">
                      <HexColorPicker
                        color={color}
                        onChange={(c) => setValue("color", c)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Text Color */}
            <div className="space-y-2">
              <Label>Text Color</Label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                  className="w-full h-10 rounded-md border flex items-center gap-2 px-3"
                >
                  <div
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: textColor }}
                  />
                  <span className="text-sm">{textColor}</span>
                </button>
                {showTextColorPicker && (
                  <div className="absolute z-50 mt-2">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowTextColorPicker(false)}
                    />
                    <div className="relative bg-white p-3 rounded-lg shadow-lg border">
                      <HexColorPicker
                        color={textColor}
                        onChange={(c) => setValue("textColor", c)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="w-full h-12 rounded-md flex items-center justify-center text-sm font-medium"
              style={{ backgroundColor: color, color: textColor }}
            >
              {watch("shortName") || "WRK"} - {watch("name") || "Activity Name"}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPaid"
                {...register("isPaid")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPaid" className="text-sm font-normal">
                Paid time
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="countsAsWorking"
                {...register("countsAsWorking")}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="countsAsWorking" className="text-sm font-normal">
                Counts as working
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : activityType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
