import { PrismaClient, ActivityCategory, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create default activity types
  const activityTypes = [
    {
      name: "Working",
      shortName: "WRK",
      description: "On-phone, working time",
      category: ActivityCategory.WORK,
      color: "#4CAF50",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: true,
      isSystemType: true,
      displayOrder: 1,
    },
    {
      name: "Lunch",
      shortName: "LCH",
      description: "Lunch break",
      category: ActivityCategory.BREAK,
      color: "#FF9800",
      textColor: "#FFFFFF",
      isPaid: false,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 2,
    },
    {
      name: "Break",
      shortName: "BRK",
      description: "Short break",
      category: ActivityCategory.BREAK,
      color: "#FFEB3B",
      textColor: "#000000",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 3,
    },
    {
      name: "Training",
      shortName: "TRN",
      description: "Training and education",
      category: ActivityCategory.TRAINING,
      color: "#2196F3",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 4,
    },
    {
      name: "Meeting",
      shortName: "MTG",
      description: "Team meetings, 1:1s, stand-ups",
      category: ActivityCategory.MEETING,
      color: "#9C27B0",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 5,
    },
    {
      name: "Project",
      shortName: "PRJ",
      description: "Off-phone project work",
      category: ActivityCategory.PROJECT,
      color: "#607D8B",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 6,
    },
    {
      name: "PTO",
      shortName: "PTO",
      description: "Paid time off / Vacation",
      category: ActivityCategory.TIME_OFF,
      color: "#03A9F4",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 7,
    },
    {
      name: "Sick",
      shortName: "SCK",
      description: "Sick leave",
      category: ActivityCategory.TIME_OFF,
      color: "#F44336",
      textColor: "#FFFFFF",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 8,
    },
    {
      name: "Holiday",
      shortName: "HOL",
      description: "Company holiday",
      category: ActivityCategory.TIME_OFF,
      color: "#FFC107",
      textColor: "#000000",
      isPaid: true,
      countsAsWorking: false,
      isSystemType: true,
      displayOrder: 9,
    },
  ];

  for (const activityType of activityTypes) {
    await prisma.activityType.upsert({
      where: { name: activityType.name },
      update: activityType,
      create: activityType,
    });
  }

  console.log(`Created ${activityTypes.length} activity types`);

  // Create default admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log(`Created admin user: ${adminUser.email}`);

  // Create default staffing requirements (24x7 with 30-min intervals)
  // Sample: Higher staffing during business hours
  const staffingData: { dayOfWeek: number; intervalStart: string; requiredStaff: number }[] = [];

  for (let day = 0; day <= 6; day++) {
    for (let hour = 0; hour < 24; hour++) {
      for (const minute of ["00", "30"]) {
        const intervalStart = `${hour.toString().padStart(2, "0")}:${minute}`;
        let requiredStaff = 3; // Default minimum staffing

        // Business hours (8am-8pm) need more staff
        if (hour >= 8 && hour < 20) {
          requiredStaff = 8;
        }
        // Peak hours (9am-5pm) need even more
        if (hour >= 9 && hour < 17) {
          requiredStaff = 12;
        }
        // Weekends have slightly less
        if (day === 0 || day === 6) {
          requiredStaff = Math.ceil(requiredStaff * 0.7);
        }

        staffingData.push({
          dayOfWeek: day,
          intervalStart,
          requiredStaff,
        });
      }
    }
  }

  for (const req of staffingData) {
    await prisma.staffingRequirement.upsert({
      where: {
        dayOfWeek_intervalStart: {
          dayOfWeek: req.dayOfWeek,
          intervalStart: req.intervalStart,
        },
      },
      update: { requiredStaff: req.requiredStaff },
      create: {
        dayOfWeek: req.dayOfWeek,
        intervalStart: req.intervalStart,
        requiredStaff: req.requiredStaff,
        minimumStaff: Math.ceil(req.requiredStaff * 0.75),
      },
    });
  }

  console.log(`Created ${staffingData.length} staffing requirement intervals`);

  // Create sample agents
  const sampleAgents = [
    { firstName: "John", lastName: "Smith", employeeId: "EMP001" },
    { firstName: "Sarah", lastName: "Johnson", employeeId: "EMP002" },
    { firstName: "Michael", lastName: "Williams", employeeId: "EMP003" },
    { firstName: "Emily", lastName: "Brown", employeeId: "EMP004" },
    { firstName: "David", lastName: "Jones", employeeId: "EMP005" },
    { firstName: "Jessica", lastName: "Garcia", employeeId: "EMP006" },
    { firstName: "Robert", lastName: "Miller", employeeId: "EMP007" },
    { firstName: "Ashley", lastName: "Davis", employeeId: "EMP008" },
    { firstName: "James", lastName: "Rodriguez", employeeId: "EMP009" },
    { firstName: "Amanda", lastName: "Martinez", employeeId: "EMP010" },
  ];

  for (let i = 0; i < sampleAgents.length; i++) {
    const agent = sampleAgents[i];
    await prisma.agent.upsert({
      where: { employeeId: agent.employeeId },
      update: {},
      create: {
        employeeId: agent.employeeId,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: `${agent.firstName.toLowerCase()}.${agent.lastName.toLowerCase()}@example.com`,
        hireDate: new Date("2024-01-15"),
        isActive: true,
        displayOrder: i + 1,
      },
    });
  }

  console.log(`Created ${sampleAgents.length} sample agents`);

  console.log("Seeding completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
