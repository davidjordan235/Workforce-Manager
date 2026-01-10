"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ExceptionsGrid } from "@/components/features/dashboard/ExceptionsGrid";
import { EmployeeStatusTile } from "@/components/features/dashboard/EmployeeStatusTile";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Set date only on client to avoid hydration mismatch
  useEffect(() => {
    setSelectedDate(new Date());
    setMounted(true);
  }, []);

  const dateString = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  // Show loading state until client-side hydration is complete
  if (!mounted) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Exceptions Grid */}
        <ExceptionsGrid date={dateString} />

        {/* Employee Status */}
        <div className="lg:col-span-1 xl:col-span-2">
          <EmployeeStatusTile />
        </div>
      </div>
    </div>
  );
}
