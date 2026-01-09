"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { format, addDays, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { ScheduleGrid } from "@/components/features/schedule/ScheduleGrid";
import { WeeklyScheduleGrid } from "@/components/features/schedule/WeeklyScheduleGrid";
import { useDepartment } from "@/hooks/useDepartments";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
} from "lucide-react";

type ViewMode = "day" | "week";

export default function DepartmentSchedulePage() {
  const params = useParams();
  const departmentId = params.id as string;
  const { data: department, isLoading: departmentLoading } = useDepartment(departmentId);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });

  const navigatePrevious = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle clicking on a day in week view to switch to day view
  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode("day");
  }, []);

  if (departmentLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Schedule" />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={`${department?.name || "Department"} Schedule`} />

      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={navigatePrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={navigateNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-4 flex items-center gap-2 text-lg font-semibold">
            <CalendarIcon className="h-5 w-5" />
            {viewMode === "day"
              ? format(currentDate, "EEEE, MMMM d, yyyy")
              : `${format(weekStart, "MMM d")} - ${format(addDays(weekStart, 6), "MMM d, yyyy")}`}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "day" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("day")}
              className="rounded-r-none"
            >
              Day
            </Button>
            <Button
              variant={viewMode === "week" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("week")}
              className="rounded-l-none"
            >
              Week
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="flex-1 overflow-hidden p-4">
        {viewMode === "day" ? (
          <ScheduleGrid date={currentDate} departmentId={departmentId} />
        ) : (
          <WeeklyScheduleGrid date={currentDate} onDayClick={handleDayClick} departmentId={departmentId} />
        )}
      </div>
    </div>
  );
}
