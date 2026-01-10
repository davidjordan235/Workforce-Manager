"use client";

import { useDashboardExceptions } from "@/hooks/useDashboardExceptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  TimeException,
  DepartureException,
  NoShowException,
  MissedPunchException,
} from "@/types/dashboard";

type ExceptionColor = "yellow" | "red" | "orange" | "blue" | "gray";

interface ExceptionBoxProps {
  count: number;
  label: string;
  color: ExceptionColor;
  children?: React.ReactNode;
}

function ExceptionBox({ count, label, color, children }: ExceptionBoxProps) {
  const colorClasses: Record<ExceptionColor, string> = {
    yellow: "border-yellow-400 text-yellow-600",
    red: "border-red-400 text-red-600",
    orange: "border-orange-400 text-orange-600",
    blue: "border-blue-400 text-blue-600",
    gray: "border-gray-300 text-gray-500",
  };

  const bgClasses: Record<ExceptionColor, string> = {
    yellow: count > 0 ? "bg-yellow-50" : "bg-white",
    red: count > 0 ? "bg-red-50" : "bg-white",
    orange: count > 0 ? "bg-orange-50" : "bg-white",
    blue: count > 0 ? "bg-blue-50" : "bg-white",
    gray: "bg-white",
  };

  const box = (
    <div
      className={`flex flex-col items-center justify-center p-3 border-2 rounded-lg ${colorClasses[color]} ${bgClasses[color]} min-h-[80px] transition-all ${count > 0 ? "cursor-pointer hover:shadow-md" : ""}`}
    >
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs text-center mt-1">{label}</span>
    </div>
  );

  if (count === 0 || !children) {
    return box;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{box}</HoverCardTrigger>
      <HoverCardContent className="w-80" side="right" align="start">
        {children}
      </HoverCardContent>
    </HoverCard>
  );
}

function formatMinutesDiff(minutes: number): string {
  const absMinutes = Math.abs(minutes);
  if (absMinutes < 60) {
    return `${absMinutes} min`;
  }
  const hours = Math.floor(absMinutes / 60);
  const remainingMins = absMinutes % 60;
  if (remainingMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMins}m`;
}

function TimeExceptionList({ exceptions, type }: { exceptions: TimeException[]; type: "early" | "late" }) {
  const isEarly = type === "early";
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">
        {isEarly ? "Arrived Early" : "Arrived Late"} ({exceptions.length})
      </h4>
      <ScrollArea className={exceptions.length > 5 ? "h-[200px]" : ""}>
        <div className="space-y-2">
          {exceptions.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <span className="font-medium">{ex.agentName}</span>
              <div className="text-right">
                <span className={isEarly ? "text-yellow-600" : "text-red-600"}>
                  {isEarly ? "-" : "+"}{formatMinutesDiff(ex.minutesDiff)}
                </span>
                <div className="text-xs text-gray-400">
                  {ex.actualStart} vs {ex.scheduledStart}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function DepartureExceptionList({ exceptions, type }: { exceptions: DepartureException[]; type: "early" | "late" }) {
  const isEarly = type === "early";
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">
        {isEarly ? "Left Early" : "Left Late"} ({exceptions.length})
      </h4>
      <ScrollArea className={exceptions.length > 5 ? "h-[200px]" : ""}>
        <div className="space-y-2">
          {exceptions.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <span className="font-medium">{ex.agentName}</span>
              <div className="text-right">
                <span className={isEarly ? "text-yellow-600" : "text-blue-600"}>
                  {isEarly ? "-" : "+"}{formatMinutesDiff(ex.minutesDiff)}
                </span>
                <div className="text-xs text-gray-400">
                  {ex.actualEnd} vs {ex.scheduledEnd}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function NoShowList({ exceptions }: { exceptions: NoShowException[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">No Shows ({exceptions.length})</h4>
      <ScrollArea className={exceptions.length > 5 ? "h-[200px]" : ""}>
        <div className="space-y-2">
          {exceptions.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <span className="font-medium">{ex.agentName}</span>
              <div className="text-xs text-gray-500">
                Scheduled {ex.scheduledStart} - {ex.scheduledEnd}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function MissedPunchList({ exceptions }: { exceptions: MissedPunchException[] }) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm">Missing Punches ({exceptions.length})</h4>
      <ScrollArea className={exceptions.length > 5 ? "h-[200px]" : ""}>
        <div className="space-y-2">
          {exceptions.map((ex, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
              <span className="font-medium">{ex.agentName}</span>
              <span className="text-orange-600 text-xs">{ex.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ExceptionsGridProps {
  date: string;
}

export function ExceptionsGrid({ date }: ExceptionsGridProps) {
  const { data: exceptions, isLoading, error } = useDashboardExceptions(date);

  const totalExceptions = exceptions
    ? exceptions.arrivedEarly.length +
      exceptions.arrivedLate.length +
      exceptions.leftEarly.length +
      exceptions.leftLate.length +
      exceptions.noShows.length +
      exceptions.missedPunches.length
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Exceptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Failed to load exceptions
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <ExceptionBox
                count={exceptions?.arrivedEarly.length || 0}
                label="Arrived Early"
                color="yellow"
              >
                {exceptions && exceptions.arrivedEarly.length > 0 && (
                  <TimeExceptionList exceptions={exceptions.arrivedEarly} type="early" />
                )}
              </ExceptionBox>

              <ExceptionBox
                count={exceptions?.arrivedLate.length || 0}
                label="Arrived Late"
                color="red"
              >
                {exceptions && exceptions.arrivedLate.length > 0 && (
                  <TimeExceptionList exceptions={exceptions.arrivedLate} type="late" />
                )}
              </ExceptionBox>

              <ExceptionBox
                count={exceptions?.leftEarly.length || 0}
                label="Left Early"
                color="yellow"
              >
                {exceptions && exceptions.leftEarly.length > 0 && (
                  <DepartureExceptionList exceptions={exceptions.leftEarly} type="early" />
                )}
              </ExceptionBox>

              <ExceptionBox
                count={exceptions?.leftLate.length || 0}
                label="Left Late"
                color="blue"
              >
                {exceptions && exceptions.leftLate.length > 0 && (
                  <DepartureExceptionList exceptions={exceptions.leftLate} type="late" />
                )}
              </ExceptionBox>

              <ExceptionBox
                count={exceptions?.noShows.length || 0}
                label="No Show"
                color="red"
              >
                {exceptions && exceptions.noShows.length > 0 && (
                  <NoShowList exceptions={exceptions.noShows} />
                )}
              </ExceptionBox>

              <ExceptionBox
                count={exceptions?.missedPunches.length || 0}
                label="Missing Punch"
                color="orange"
              >
                {exceptions && exceptions.missedPunches.length > 0 && (
                  <MissedPunchList exceptions={exceptions.missedPunches} />
                )}
              </ExceptionBox>
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t text-center">
              <span className="text-3xl font-bold text-gray-700">{totalExceptions}</span>
              <p className="text-sm text-gray-500 mt-1">All Exceptions</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
