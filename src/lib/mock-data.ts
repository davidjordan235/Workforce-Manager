// Mock data for development without database connection

export type MockActivityType = {
  id: string;
  name: string;
  shortName: string;
  description: string | null;
  category: "WORK" | "BREAK" | "TRAINING" | "MEETING" | "PROJECT" | "TIME_OFF" | "CUSTOM";
  color: string;
  textColor: string;
  isPaid: boolean;
  countsAsWorking: boolean;
  isActive: boolean;
  isSystemType: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type MockAgent = {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  hireDate: Date;
  isActive: boolean;
  displayOrder: number;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SUPERVISOR" | "AGENT";
  isActive: boolean;
};

// Default activity types
export const mockActivityTypes: MockActivityType[] = [
  {
    id: "act-1",
    name: "Working",
    shortName: "WRK",
    description: "On-phone, working time",
    category: "WORK",
    color: "#4CAF50",
    textColor: "#FFFFFF",
    isPaid: true,
    countsAsWorking: true,
    isActive: true,
    isSystemType: true,
    displayOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-2",
    name: "Lunch",
    shortName: "LCH",
    description: "Lunch break",
    category: "BREAK",
    color: "#FF9800",
    textColor: "#FFFFFF",
    isPaid: false,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-3",
    name: "Break",
    shortName: "BRK",
    description: "Short break",
    category: "BREAK",
    color: "#FFEB3B",
    textColor: "#000000",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 3,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-4",
    name: "Training",
    shortName: "TRN",
    description: "Training and education",
    category: "TRAINING",
    color: "#2196F3",
    textColor: "#FFFFFF",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 4,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-5",
    name: "Meeting",
    shortName: "MTG",
    description: "Team meetings, 1:1s, stand-ups",
    category: "MEETING",
    color: "#9C27B0",
    textColor: "#FFFFFF",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-6",
    name: "Project",
    shortName: "PRJ",
    description: "Off-phone project work",
    category: "PROJECT",
    color: "#607D8B",
    textColor: "#FFFFFF",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 6,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-7",
    name: "PTO",
    shortName: "PTO",
    description: "Paid time off / Vacation",
    category: "TIME_OFF",
    color: "#03A9F4",
    textColor: "#FFFFFF",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 7,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-8",
    name: "Sick",
    shortName: "SCK",
    description: "Sick leave",
    category: "TIME_OFF",
    color: "#F44336",
    textColor: "#FFFFFF",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "act-9",
    name: "Holiday",
    shortName: "HOL",
    description: "Company holiday",
    category: "TIME_OFF",
    color: "#FFC107",
    textColor: "#000000",
    isPaid: true,
    countsAsWorking: false,
    isActive: true,
    isSystemType: true,
    displayOrder: 9,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Sample agents
export const mockAgents: MockAgent[] = [
  { id: "agent-1", employeeId: "EMP001", firstName: "John", lastName: "Smith", email: "john.smith@example.com", phone: "555-0101", hireDate: new Date("2023-01-15"), isActive: true, displayOrder: 1, color: "#4CAF50", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-2", employeeId: "EMP002", firstName: "Sarah", lastName: "Johnson", email: "sarah.johnson@example.com", phone: "555-0102", hireDate: new Date("2023-02-20"), isActive: true, displayOrder: 2, color: "#2196F3", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-3", employeeId: "EMP003", firstName: "Michael", lastName: "Williams", email: "michael.williams@example.com", phone: "555-0103", hireDate: new Date("2023-03-10"), isActive: true, displayOrder: 3, color: "#FF9800", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-4", employeeId: "EMP004", firstName: "Emily", lastName: "Brown", email: "emily.brown@example.com", phone: "555-0104", hireDate: new Date("2023-04-05"), isActive: true, displayOrder: 4, color: "#9C27B0", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-5", employeeId: "EMP005", firstName: "David", lastName: "Jones", email: "david.jones@example.com", phone: "555-0105", hireDate: new Date("2023-05-15"), isActive: true, displayOrder: 5, color: "#F44336", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-6", employeeId: "EMP006", firstName: "Jessica", lastName: "Garcia", email: "jessica.garcia@example.com", phone: "555-0106", hireDate: new Date("2023-06-20"), isActive: true, displayOrder: 6, color: "#00BCD4", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-7", employeeId: "EMP007", firstName: "Robert", lastName: "Miller", email: "robert.miller@example.com", phone: "555-0107", hireDate: new Date("2023-07-10"), isActive: true, displayOrder: 7, color: "#8BC34A", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-8", employeeId: "EMP008", firstName: "Ashley", lastName: "Davis", email: "ashley.davis@example.com", phone: "555-0108", hireDate: new Date("2023-08-05"), isActive: true, displayOrder: 8, color: "#FF5722", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-9", employeeId: "EMP009", firstName: "James", lastName: "Rodriguez", email: "james.rodriguez@example.com", phone: "555-0109", hireDate: new Date("2023-09-15"), isActive: true, displayOrder: 9, color: "#673AB7", createdAt: new Date(), updatedAt: new Date() },
  { id: "agent-10", employeeId: "EMP010", firstName: "Amanda", lastName: "Martinez", email: "amanda.martinez@example.com", phone: "555-0110", hireDate: new Date("2023-10-20"), isActive: true, displayOrder: 10, color: "#009688", createdAt: new Date(), updatedAt: new Date() },
];

// Mock admin user
export const mockUser: MockUser = {
  id: "user-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "ADMIN",
  isActive: true,
};

// Schedule entry type
export type MockScheduleEntry = {
  id: string;
  agentId: string;
  activityTypeId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// Generate sample schedule entries for today
function generateSampleSchedules(): MockScheduleEntry[] {
  const today = new Date().toISOString().split("T")[0];
  const entries: MockScheduleEntry[] = [];

  // Sample schedules for each agent
  const schedulePatterns = [
    { start: "08:00", end: "12:00", activity: "act-1", break1Start: "10:00", break1End: "10:30" },
    { start: "09:00", end: "13:00", activity: "act-1", break1Start: "11:00", break1End: "11:30" },
    { start: "07:00", end: "11:00", activity: "act-1", break1Start: "09:00", break1End: "09:30" },
    { start: "10:00", end: "14:00", activity: "act-1", break1Start: "12:00", break1End: "12:30" },
    { start: "08:30", end: "12:30", activity: "act-1", break1Start: "10:30", break1End: "11:00" },
  ];

  mockAgents.slice(0, 5).forEach((agent, index) => {
    const pattern = schedulePatterns[index % schedulePatterns.length];

    // Morning shift
    entries.push({
      id: `sched-${agent.id}-1`,
      agentId: agent.id,
      activityTypeId: pattern.activity,
      date: today,
      startTime: pattern.start,
      endTime: pattern.break1Start,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Break
    entries.push({
      id: `sched-${agent.id}-2`,
      agentId: agent.id,
      activityTypeId: "act-3", // Break
      date: today,
      startTime: pattern.break1Start,
      endTime: pattern.break1End,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Continue shift
    entries.push({
      id: `sched-${agent.id}-3`,
      agentId: agent.id,
      activityTypeId: pattern.activity,
      date: today,
      startTime: pattern.break1End,
      endTime: pattern.end,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Lunch
    entries.push({
      id: `sched-${agent.id}-4`,
      agentId: agent.id,
      activityTypeId: "act-2", // Lunch
      date: today,
      startTime: pattern.end,
      endTime: `${parseInt(pattern.end.split(":")[0]) + 1}:00`,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Afternoon shift
    const afternoonStart = `${parseInt(pattern.end.split(":")[0]) + 1}:00`;
    const afternoonEnd = `${parseInt(pattern.end.split(":")[0]) + 5}:00`;
    entries.push({
      id: `sched-${agent.id}-5`,
      agentId: agent.id,
      activityTypeId: pattern.activity,
      date: today,
      startTime: afternoonStart,
      endTime: afternoonEnd,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  return entries;
}

export const mockScheduleEntries: MockScheduleEntry[] = generateSampleSchedules();
