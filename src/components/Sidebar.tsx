"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Activity,
  Dumbbell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/forecast", label: "Forecast", icon: BarChart3 },
  { href: "/dashboard/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/dashboard/activities", label: "Activities", icon: Dumbbell },
  { href: "/dashboard/burnout", label: "Burnout", icon: Activity },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const userName = session?.user?.name || "Student";
  const userEmail = session?.user?.email || "student@university.ac.in";

  return (
    <aside
      className={`sidebar flex flex-col transition-all duration-200 ${
        collapsed ? "md:!w-[64px]" : ""
      }`}
    >
      {/* Logo — desktop only */}
      <div className="hidden md:flex items-center gap-2.5 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-sm font-bold">C</span>
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
              Campus Life OS
            </h1>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 md:px-2.5 py-0 md:py-3 flex flex-row md:flex-col items-center justify-around md:justify-start gap-0.5 w-full h-full md:h-auto overflow-x-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""} ${
                collapsed ? "md:justify-center md:!px-0" : ""
              } flex-col md:flex-row !gap-1 md:!gap-2.5 flex-1 md:flex-none justify-center h-full md:h-auto min-w-[56px] md:min-w-0`}
              title={item.label}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span
                className={`text-[10px] md:text-[13px] ${
                  collapsed ? "md:hidden" : "block"
                } whitespace-nowrap`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle — desktop */}
      <div className="hidden md:block px-2.5 pb-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-link w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>

      {/* User — desktop */}
      {!collapsed && (
        <div className="hidden md:block px-3 pb-4">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[var(--bg-surface)]">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={userName}
                className="w-7 h-7 rounded-full"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                {userName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {userName}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {userEmail}
              </p>
            </div>
            {session && (
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
