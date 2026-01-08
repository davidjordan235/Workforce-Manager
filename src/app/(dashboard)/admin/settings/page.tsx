"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, Check } from "lucide-react";
import { toast } from "sonner";
import { useSettings, useUpdateSettings, IN_OFFICE_COLOR_OPTIONS } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const handleColorChange = async (color: string, textColor: string) => {
    try {
      await updateSettings.mutateAsync({
        inOfficeColor: color,
        inOfficeTextColor: textColor,
      });
      toast.success("In-office color updated");
    } catch {
      toast.error("Failed to update settings");
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" />

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Application Settings</h2>
            <p className="text-sm text-muted-foreground">
              Configure application preferences and display options
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                In-Office Day Color
              </CardTitle>
              <CardDescription>
                Choose the color used to highlight days when an agent is scheduled to work in the office.
                Right-click on any day in the weekly schedule view to toggle in-office status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label>Select a color</Label>
                <div className="grid grid-cols-4 gap-3">
                  {IN_OFFICE_COLOR_OPTIONS.map((option) => {
                    const isSelected = settings?.inOfficeColor === option.color;
                    return (
                      <button
                        key={option.color}
                        onClick={() => handleColorChange(option.color, option.textColor)}
                        className={cn(
                          "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
                          isSelected
                            ? "border-gray-900 shadow-md"
                            : "border-transparent hover:border-gray-300"
                        )}
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: option.color }}
                        >
                          {isSelected && (
                            <Check className="h-6 w-6" style={{ color: option.textColor }} />
                          )}
                        </div>
                        <span className="text-xs font-medium">{option.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 rounded-lg border bg-gray-50">
                  <Label className="text-sm text-muted-foreground">Preview</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-md"
                      style={{ backgroundColor: settings?.inOfficeColor || "#9333ea" }}
                    >
                      <Building2
                        className="h-4 w-4"
                        style={{ color: settings?.inOfficeTextColor || "#ffffff" }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: settings?.inOfficeTextColor || "#ffffff" }}
                      >
                        In Office Day
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      This is how in-office days will appear in the schedule
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
