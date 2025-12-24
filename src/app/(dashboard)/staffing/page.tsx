"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function StaffingPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Staffing Requirements" />

      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Staffing Requirements</h2>
          <p className="text-sm text-muted-foreground">
            Configure the number of agents required for each 30-minute interval
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Weekly Staffing Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Staffing requirements editor will be implemented in Phase 5.
              <br />
              You will be able to set required staff levels for each 30-minute interval.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
