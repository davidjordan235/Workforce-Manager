"use client";

import { useState } from "react";
import { useDashboardExceptions } from "@/hooks/useDashboardExceptions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  UserX,
  LogIn,
  LogOut,
  AlertCircle,
} from "lucide-react";
import {
  TimeException,
  DepartureException,
  NoShowException,
  MissedPunchException,
} from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface ExceptionSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExceptionSection({
  title,
  count,
  icon,
  color,
  bgColor,
  children,
  defaultOpen = false,
}: ExceptionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen && count > 0);

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => count > 0 && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
          count > 0 ? `${bgColor} hover:bg-opacity-80 cursor-pointer` : "bg-gray-50 cursor-default"
        )}
      >
        {count > 0 ? (
          isOpen ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )
        ) : (
          <div className="h-4 w-4 flex-shrink-0" />
        )}
        {icon}
        <span className={cn("font-medium text-sm", count > 0 ? color : "text-gray-400")}>{title}</span>
        <Badge variant={count > 0 ? "secondary" : "outline"} className="ml-auto">
          {count}
        </Badge>
      </button>
      {isOpen && count > 0 && <div className="px-3 py-2 bg-white space-y-1">{children}</div>}
    </div>
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

function TimeExceptionItem({ exception, type }: { exception: TimeException; type: "early" | "late" }) {
  const isEarly = type === "early";
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-700">{exception.agentName}</span>
      <span className={cn("font-medium", isEarly ? "text-yellow-600" : "text-red-600")}>
        {isEarly ? "-" : "+"}{formatMinutesDiff(exception.minutesDiff)}
        <span className="text-gray-400 font-normal ml-1">
          ({exception.actualStart} vs {exception.scheduledStart})
        </span>
      </span>
    </div>
  );
}

function DepartureExceptionItem({ exception, type }: { exception: DepartureException; type: "early" | "late" }) {
  const isEarly = type === "early";
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-700">{exception.agentName}</span>
      <span className={cn("font-medium", isEarly ? "text-yellow-600" : "text-blue-600")}>
        {isEarly ? "-" : "+"}{formatMinutesDiff(exception.minutesDiff)}
        <span className="text-gray-400 font-normal ml-1">
          ({exception.actualEnd} vs {exception.scheduledEnd})
        </span>
      </span>
    </div>
  );
}

function NoShowItem({ exception }: { exception: NoShowException }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-700">{exception.agentName}</span>
      <span className="text-gray-400">
        Scheduled {exception.scheduledStart} - {exception.scheduledEnd}
      </span>
    </div>
  );
}

function MissedPunchItem({ exception }: { exception: MissedPunchException }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-700">{exception.agentName}</span>
      <span className="text-orange-600 font-medium">{exception.message}</span>
    </div>
  );
}

interface ExceptionsTileProps {
  date: string;
}

export function ExceptionsTile({ date }: ExceptionsTileProps) {
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
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Exceptions
          {totalExceptions > 0 && (
            <Badge variant="destructive" className="ml-2">
              {totalExceptions}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            Failed to load exceptions
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-3">
            <div className="space-y-2">
              {/* Arrived Early */}
              <ExceptionSection
                title="Arrived Early"
                count={exceptions?.arrivedEarly.length || 0}
                icon={<LogIn className="h-4 w-4 text-yellow-500" />}
                color="text-yellow-700"
                bgColor="bg-yellow-50"
                defaultOpen={true}
              >
                {exceptions?.arrivedEarly.map((ex, i) => (
                  <TimeExceptionItem key={i} exception={ex} type="early" />
                ))}
              </ExceptionSection>

              {/* Arrived Late */}
              <ExceptionSection
                title="Arrived Late"
                count={exceptions?.arrivedLate.length || 0}
                icon={<Clock className="h-4 w-4 text-red-500" />}
                color="text-red-700"
                bgColor="bg-red-50"
                defaultOpen={true}
              >
                {exceptions?.arrivedLate.map((ex, i) => (
                  <TimeExceptionItem key={i} exception={ex} type="late" />
                ))}
              </ExceptionSection>

              {/* Left Early */}
              <ExceptionSection
                title="Left Early"
                count={exceptions?.leftEarly.length || 0}
                icon={<LogOut className="h-4 w-4 text-yellow-500" />}
                color="text-yellow-700"
                bgColor="bg-yellow-50"
                defaultOpen={true}
              >
                {exceptions?.leftEarly.map((ex, i) => (
                  <DepartureExceptionItem key={i} exception={ex} type="early" />
                ))}
              </ExceptionSection>

              {/* Left Late */}
              <ExceptionSection
                title="Left Late"
                count={exceptions?.leftLate.length || 0}
                icon={<LogOut className="h-4 w-4 text-blue-500" />}
                color="text-blue-700"
                bgColor="bg-blue-50"
                defaultOpen={true}
              >
                {exceptions?.leftLate.map((ex, i) => (
                  <DepartureExceptionItem key={i} exception={ex} type="late" />
                ))}
              </ExceptionSection>

              {/* No Shows */}
              <ExceptionSection
                title="No Shows"
                count={exceptions?.noShows.length || 0}
                icon={<UserX className="h-4 w-4 text-red-500" />}
                color="text-red-700"
                bgColor="bg-red-50"
                defaultOpen={true}
              >
                {exceptions?.noShows.map((ex, i) => (
                  <NoShowItem key={i} exception={ex} />
                ))}
              </ExceptionSection>

              {/* Missing Punches */}
              <ExceptionSection
                title="Missing Punches"
                count={exceptions?.missedPunches.length || 0}
                icon={<AlertCircle className="h-4 w-4 text-orange-500" />}
                color="text-orange-700"
                bgColor="bg-orange-50"
                defaultOpen={true}
              >
                {exceptions?.missedPunches.map((ex, i) => (
                  <MissedPunchItem key={i} exception={ex} />
                ))}
              </ExceptionSection>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
