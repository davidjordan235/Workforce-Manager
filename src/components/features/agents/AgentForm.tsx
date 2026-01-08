"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { HexColorPicker } from "react-colorful";
import { format } from "date-fns";
import { Agent } from "@/hooks/useAgents";
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
import { agentSchema, AgentInput, getRandomAgentColor, agentColors } from "@/types/agent";

interface AgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
  onSubmit: (data: AgentInput) => Promise<void>;
  isLoading?: boolean;
}

export function AgentForm({
  open,
  onOpenChange,
  agent,
  onSubmit,
  isLoading,
}: AgentFormProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AgentInput>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      hireDate: format(new Date(), "yyyy-MM-dd"),
      color: getRandomAgentColor(),
    },
  });

  const color = watch("color");

  // Reset form when agent changes
  useEffect(() => {
    if (agent) {
      reset({
        employeeId: agent.employeeId,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phone: agent.phone || "",
        hireDate: format(new Date(agent.hireDate), "yyyy-MM-dd"),
        color: agent.color || getRandomAgentColor(),
      });
    } else {
      reset({
        employeeId: "",
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        hireDate: format(new Date(), "yyyy-MM-dd"),
        color: getRandomAgentColor(),
      });
    }
  }, [agent, reset]);

  const handleFormSubmit = async (data: AgentInput) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {agent ? "Edit Agent" : "Add New Agent"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Employee ID */}
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                {...register("employeeId")}
                placeholder="e.g., EMP001"
              />
              {errors.employeeId && (
                <p className="text-sm text-red-500">{errors.employeeId.message}</p>
              )}
            </div>

            {/* Hire Date */}
            <div className="space-y-2">
              <Label htmlFor="hireDate">Hire Date</Label>
              <Input
                id="hireDate"
                type="date"
                {...register("hireDate")}
              />
              {errors.hireDate && (
                <p className="text-sm text-red-500">{errors.hireDate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Smith"
              />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="john.smith@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="555-0100"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Agent Color</Label>
            <div className="flex items-center gap-4">
              {/* Quick color selection */}
              <div className="flex flex-wrap gap-2">
                {agentColors.slice(0, 8).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setValue("color", c)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                      color === c ? "border-gray-900 scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              {/* Custom color picker */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400"
                  title="Custom color"
                >
                  +
                </button>
                {showColorPicker && (
                  <div className="absolute z-50 mt-2 right-0">
                    <div
                      className="fixed inset-0"
                      onClick={() => setShowColorPicker(false)}
                    />
                    <div className="relative bg-white p-3 rounded-lg shadow-lg border">
                      <HexColorPicker
                        color={color || "#4CAF50"}
                        onChange={(c) => setValue("color", c)}
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
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: color || "#4CAF50" }}
              >
                {(watch("firstName")?.[0] || "J").toUpperCase()}
                {(watch("lastName")?.[0] || "S").toUpperCase()}
              </div>
              <div>
                <p className="font-medium">
                  {watch("firstName") || "John"} {watch("lastName") || "Smith"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {watch("employeeId") || "EMP001"} • {watch("email") || "john.smith@example.com"}
                </p>
              </div>
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
              {isLoading ? "Saving..." : agent ? "Update" : "Add Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
