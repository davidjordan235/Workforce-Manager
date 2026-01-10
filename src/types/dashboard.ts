// Dashboard exception types

export interface TimeException {
  agentId: string;
  agentName: string;
  scheduledStart: string;  // "HH:MM" format
  actualStart: string;     // "HH:MM" format
  minutesDiff: number;     // Positive = late, negative = early
}

export interface DepartureException {
  agentId: string;
  agentName: string;
  scheduledEnd: string;    // "HH:MM" format
  actualEnd: string;       // "HH:MM" format
  minutesDiff: number;     // Positive = late, negative = early
}

export interface NoShowException {
  agentId: string;
  agentName: string;
  scheduledStart: string;  // "HH:MM" format
  scheduledEnd: string;    // "HH:MM" format
}

export interface MissedPunchException {
  agentId: string;
  agentName: string;
  punchType: "CLOCK_IN" | "CLOCK_OUT";
  punchTimes: string[];    // ISO timestamps
  message: string;         // Human-readable description
}

export interface DashboardExceptions {
  arrivedEarly: TimeException[];
  arrivedLate: TimeException[];
  leftEarly: DepartureException[];
  leftLate: DepartureException[];
  noShows: NoShowException[];
  missedPunches: MissedPunchException[];
}

export interface ClockedInEmployee {
  agentId: string;
  firstName: string;
  lastName: string;
  color: string;
  clockInTime: string;     // ISO timestamp
}
