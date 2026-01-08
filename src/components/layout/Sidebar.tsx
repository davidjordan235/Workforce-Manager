"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mockUser } from "@/lib/mock-data";
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
} from "lucide-react";

const navigation = [
  { name: "Schedule", href: "/schedule", icon: Calendar, roles: ["ADMIN", "SUPERVISOR", "AGENT"] },
  { name: "Activities", href: "/activities", icon: Palette, roles: ["ADMIN"] },
];

const staffingNavigation = [
  { name: "Employees", href: "/staffing/employees", icon: Users, roles: ["ADMIN", "SUPERVISOR"] },
  { name: "Departments", href: "/staffing/departments", icon: Building2, roles: ["ADMIN"] },
  { name: "Employment Types", href: "/staffing/employment-types", icon: Briefcase, roles: ["ADMIN"] },
];

const adminNavigation = [
  { name: "Users", href: "/admin/users", icon: UserCog, roles: ["ADMIN"] },
  { name: "Settings", href: "/admin/settings", icon: Settings, roles: ["ADMIN"] },
];

const timeClockNavigation = [
  { name: "Enrollments", href: "/admin/time-clock/enrollments", icon: UserCheck, roles: ["ADMIN", "SUPERVISOR"] },
  { name: "Punches", href: "/admin/time-clock/punches", icon: ClipboardList, roles: ["ADMIN", "SUPERVISOR"] },
  { name: "Reports", href: "/admin/time-clock/reports", icon: FileText, roles: ["ADMIN", "SUPERVISOR"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const userRole = mockUser.role;

  const filterByRole = (items: typeof navigation) => {
    return items.filter((item) => item.roles.includes(userRole || ""));
  };

  return (
    <div className="flex h-full w-64 flex-col bg-gray-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6 text-white">
        <Calendar className="h-8 w-8" />
        <span className="text-lg font-semibold">Workforce Manager</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        <div className="space-y-1">
          {filterByRole(navigation).map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </div>

        {/* Staffing Section */}
        {(userRole === "ADMIN" || userRole === "SUPERVISOR") && (
          <>
            <div className="my-4 border-t border-gray-700" />
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Staffing
            </div>
            <div className="mt-2 space-y-1">
              {filterByRole(staffingNavigation).map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Time Clock Section */}
        {(userRole === "ADMIN" || userRole === "SUPERVISOR") && (
          <>
            <div className="my-4 border-t border-gray-700" />
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Time Clock
            </div>
            <div className="mt-2 space-y-1">
              {filterByRole(timeClockNavigation).map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}

        {/* Admin Section */}
        {userRole === "ADMIN" && (
          <>
            <div className="my-4 border-t border-gray-700" />
            <div className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Administration
            </div>
            <div className="mt-2 space-y-1">
              {filterByRole(adminNavigation).map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gray-800 text-white"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* User info */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
            {mockUser.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-white">
              {mockUser.name}
            </p>
            <p className="truncate text-xs text-gray-400">
              {userRole}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
