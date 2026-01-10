"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mock-data";
import { useDepartments } from "@/hooks/useDepartments";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Users,
  Palette,
  BarChart3,
  Settings,
  UserCog,
  Clock,
  ClipboardList,
  FileText,
  UserCheck,
  Building2,
  Briefcase,
  ChevronDown,
  ChevronRight,
  Loader2,
  LogIn,
  ListTodo,
  History,
  PieChart,
  PanelLeftClose,
  LayoutDashboard,
} from "lucide-react";

const staffingNavigation = [
  { name: "Employees", href: "/staffing/employees", icon: Users, roles: ["ADMIN", "SUPERVISOR"] },
  { name: "Departments", href: "/staffing/departments", icon: Building2, roles: ["ADMIN"] },
  { name: "Employment Types", href: "/staffing/employment-types", icon: Briefcase, roles: ["ADMIN"] },
];

const adminNavigation = [
  { name: "Users", href: "/admin/users", icon: UserCog, roles: ["ADMIN"] },
  { name: "Activities", href: "/activities", icon: Palette, roles: ["ADMIN"] },
  { name: "Settings", href: "/admin/settings", icon: Settings, roles: ["ADMIN"] },
];

const timeClockNavigation = [
  { name: "Clock In/Out", href: "/tech", icon: LogIn, roles: ["ADMIN", "SUPERVISOR", "AGENT"] },
  { name: "Enrollments", href: "/admin/time-clock/enrollments", icon: UserCheck, roles: ["ADMIN", "SUPERVISOR"] },
  { name: "Punches", href: "/admin/time-clock/punches", icon: ClipboardList, roles: ["ADMIN", "SUPERVISOR"] },
  { name: "Reports", href: "/admin/time-clock/reports", icon: FileText, roles: ["ADMIN", "SUPERVISOR"] },
];

const activityTrackingNavigation = [
  { name: "Log Activity", href: "/activity-tracking/log", icon: ListTodo, roles: ["ADMIN", "SUPERVISOR", "AGENT"] },
  { name: "Activity History", href: "/activity-tracking/history", icon: History, roles: ["ADMIN", "SUPERVISOR", "AGENT"] },
  { name: "Activity Reports", href: "/activity-tracking/reports", icon: PieChart, roles: ["ADMIN", "SUPERVISOR"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const userRole = mockUser.role;
  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
  };

  // Filter departments to only show those with schedules enabled
  const scheduleDepartments = departments?.filter((dept) => dept.hasSchedule) || [];

  const filterByRole = <T extends { roles: string[] }>(items: T[]) => {
    return items.filter((item) => item.roles.includes(userRole || ""));
  };

  // Navigation item component with tooltip support
  const NavItem = ({
    href,
    icon: Icon,
    name,
    isActive,
    indent = false
  }: {
    href: string;
    icon: React.ElementType;
    name: string;
    isActive: boolean;
    indent?: boolean;
  }) => {
    const content = (
      <Link
        href={href}
        className={cn(
          "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          indent && !isCollapsed && "pl-6",
          isActive
            ? "bg-gray-800 text-white"
            : "text-gray-300 hover:bg-gray-800 hover:text-white",
          isCollapsed && "justify-center px-2"
        )}
      >
        <Icon className={cn("h-5 w-5 flex-shrink-0", indent && "h-4 w-4")} />
        {!isCollapsed && <span className="truncate">{name}</span>}
      </Link>
    );

    if (isCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  // Section header component
  const SectionHeader = ({ title }: { title: string }) => {
    if (isCollapsed) {
      return <div className="my-2 border-t border-gray-700" />;
    }
    return (
      <>
        <div className="my-4 border-t border-gray-700" />
        <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          {title}
        </div>
      </>
    );
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex h-full flex-col bg-gray-900 transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center text-white",
          isCollapsed ? "justify-center px-2" : "gap-2 px-6"
        )}>
          <Calendar className="h-8 w-8 flex-shrink-0" />
          {!isCollapsed && <span className="text-lg font-semibold">Workforce Manager</span>}
        </div>

        {/* Collapse Toggle */}
        <div className={cn("px-3", isCollapsed && "px-2")}>
          <button
            onClick={toggleCollapsed}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors",
              isCollapsed && "justify-center px-2"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 py-4 overflow-y-auto",
          isCollapsed ? "px-2" : "px-3"
        )}>
          {/* Dashboard - always visible at top */}
          <NavItem
            href="/dashboard"
            icon={LayoutDashboard}
            name="Dashboard"
            isActive={pathname === "/dashboard"}
          />

          {/* Schedules Section - only show if there are departments with schedules */}
          {(scheduleDepartments.length > 0 || departmentsLoading) && (
            <>
              {!isCollapsed && (
                <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Schedules
                </div>
              )}
              <div className="mt-2 space-y-1">
                <NavItem
                  href="/schedule"
                  icon={Calendar}
                  name="All Departments"
                  isActive={pathname === "/schedule"}
                />
                {departmentsLoading ? (
                  !isCollapsed && (
                    <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </div>
                  )
                ) : (
                  scheduleDepartments.map((dept) => (
                    <NavItem
                      key={dept.id}
                      href={`/schedule/department/${dept.id}`}
                      icon={Building2}
                      name={dept.name}
                      isActive={pathname === `/schedule/department/${dept.id}`}
                      indent
                    />
                  ))
                )}
              </div>
            </>
          )}

          {/* Staffing Section */}
          {(userRole === "ADMIN" || userRole === "SUPERVISOR") && (
            <>
              <SectionHeader title="Staffing" />
              <div className="mt-2 space-y-1">
                {filterByRole(staffingNavigation).map((item) => (
                  <NavItem
                    key={item.name}
                    href={item.href}
                    icon={item.icon}
                    name={item.name}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  />
                ))}
              </div>
            </>
          )}

          {/* Time Clock Section */}
          {(userRole === "ADMIN" || userRole === "SUPERVISOR" || userRole === "AGENT") && (
            <>
              <SectionHeader title="Time Clock" />
              <div className="mt-2 space-y-1">
                {filterByRole(timeClockNavigation).map((item) => (
                  <NavItem
                    key={item.name}
                    href={item.href}
                    icon={item.icon}
                    name={item.name}
                    isActive={pathname === item.href}
                  />
                ))}
              </div>
            </>
          )}

          {/* Activity Tracking Section */}
          {(userRole === "ADMIN" || userRole === "SUPERVISOR" || userRole === "AGENT") && (
            <>
              <SectionHeader title="Activity Tracking" />
              <div className="mt-2 space-y-1">
                {filterByRole(activityTrackingNavigation).map((item) => (
                  <NavItem
                    key={item.name}
                    href={item.href}
                    icon={item.icon}
                    name={item.name}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  />
                ))}
              </div>
            </>
          )}

          {/* Admin Section */}
          {userRole === "ADMIN" && (
            <>
              <SectionHeader title="Administration" />
              <div className="mt-2 space-y-1">
                {filterByRole(adminNavigation).map((item) => (
                  <NavItem
                    key={item.name}
                    href={item.href}
                    icon={item.icon}
                    name={item.name}
                    isActive={pathname.startsWith(item.href)}
                  />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User info */}
        <div className="border-t border-gray-700 p-4">
          <div className={cn(
            "flex items-center",
            isCollapsed ? "justify-center" : "gap-3"
          )}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white flex-shrink-0">
                  {mockUser.name.charAt(0).toUpperCase()}
                </div>
              </TooltipTrigger>
              {isCollapsed && (
                <TooltipContent side="right">
                  <p className="font-medium">{mockUser.name}</p>
                  <p className="text-xs text-muted-foreground">{userRole}</p>
                </TooltipContent>
              )}
            </Tooltip>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white">
                  {mockUser.name}
                </p>
                <p className="truncate text-xs text-gray-400">
                  {userRole}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
