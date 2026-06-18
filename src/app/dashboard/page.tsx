"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import {
  demoTasks,
  demoConflicts,
  getWorkloadData,
  calculateBurnoutScore,
  type Task,
} from "@/lib/demo-data";
import TaskCard from "@/components/TaskCard";
import BurnoutMeter from "@/components/BurnoutMeter";
import WorkloadChart from "@/components/WorkloadChart";
import ConflictBanner from "@/components/ConflictBanner";
import {
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Inbox,
  Bell,
  Calendar,
} from "lucide-react";

type FilterType = "active" | "pending" | "in_progress" | "completed";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterType>("active");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState<string>("");

  const workloadData = getWorkloadData(tasks);
  const burnout = calculateBurnoutScore(tasks);

  // Load tasks from Supabase on mount
  useEffect(() => {
    // Load display name from profile
    try {
      const raw = localStorage.getItem("campus-life-os-profile");
      if (raw) {
        const profile = JSON.parse(raw);
        if (profile.displayName) {
          setDisplayName(profile.displayName);
        }
      }
    } catch (e) {}

    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_email", userEmail)
        .order("deadline", { ascending: true });

      if (error) {
        console.error("Error fetching tasks:", error);
      } else if (data && data.length > 0) {
        const formattedTasks: Task[] = data.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          subjectCourse: t.subject_course,
          taskType: t.task_type,
          deadline: t.deadline,
          estimatedEffortHours: t.estimated_effort_hours,
          priority: t.priority,
          status: t.status,
          source: t.source,
          aiConfidence: t.ai_confidence,
          createdAt: t.created_at || new Date().toISOString(),
        }));

        // Automatic Weekly Cleanup: Delete completed tasks older than 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const tasksToKeep = formattedTasks.filter((t) => {
          if (t.status !== "completed") return true;
          const dateToCompare = t.deadline ? new Date(t.deadline) : new Date(t.createdAt);
          return dateToCompare >= sevenDaysAgo;
        });

        const tasksToDelete = formattedTasks
          .filter(t => !tasksToKeep.includes(t))
          .map(t => t.id);

        if (tasksToDelete.length > 0) {
          // Delete from Supabase in the background
          supabase.from("tasks").delete().in("id", tasksToDelete).then(({ error }) => {
            if (error) console.error("Failed to cleanup old completed tasks:", error);
            else console.log(`Cleaned up ${tasksToDelete.length} old completed tasks`);
          });
        }

        setTasks(tasksToKeep);
      } else {
        setTasks([]);
      }
    };

    const fetchCalendar = async () => {
      try {
        const res = await fetch("/api/calendar");
        const data = await res.json();
        if (data.events) {
          setCalendarEvents(data.events);
        }
      } catch (err) {
        console.error("Failed to fetch calendar:", err);
      }
    };

    fetchTasks();
    fetchCalendar();
  }, [session]);


  // Real email sync
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);

    const accessToken = (session as any)?.accessToken;
    const userEmail = session?.user?.email;

    if (!accessToken || !userEmail) {
      setSyncResult("Demo mode — sign in with Google for live sync");
      setTimeout(() => setSyncing(false), 1500);
      return;
    }

    // Read personal emails and last sync timestamp from profile settings
    let accounts: { email: string; accessToken: string }[] = [];
    
    // Add primary account
    accounts.push({ email: userEmail, accessToken });
    
    let lastSyncTimestamp: number | null = null;
    try {
      const profileRaw = localStorage.getItem("campus-life-os-profile");
      if (profileRaw) {
        let profile = JSON.parse(profileRaw);
        if (profile.personalEmails) {
           let updatedProfile = false;
           
           for (let i = 0; i < profile.personalEmails.length; i++) {
             let p = profile.personalEmails[i];
             
             // Check if token is expired (or expires in the next 5 minutes)
             if (p.accessToken && p.expiresAt && p.expiresAt < Date.now() + 300000) {
               if (p.refreshToken) {
                 console.log(`Refreshing token for ${p.email}...`);
                 try {
                   const refreshRes = await fetch("/api/auth/refresh", {
                     method: "POST",
                     headers: { "Content-Type": "application/json" },
                     body: JSON.stringify({ refreshToken: p.refreshToken })
                   });
                   const refreshData = await refreshRes.json();
                   
                   if (refreshRes.ok && refreshData.accessToken) {
                     p.accessToken = refreshData.accessToken;
                     p.expiresAt = Date.now() + (parseInt(refreshData.expiresIn || "3600", 10) * 1000);
                     updatedProfile = true;
                     console.log(`Successfully refreshed token for ${p.email}`);
                   } else {
                     console.warn(`Failed to refresh token for ${p.email}:`, refreshData);
                   }
                 } catch (err) {
                   console.error(`Error refreshing token for ${p.email}:`, err);
                 }
               } else {
                 console.warn(`Token for ${p.email} is expired and no refresh token exists. Needs re-auth.`);
               }
             }
             
             // Add to accounts list if valid
             if (p.accessToken && (!p.expiresAt || p.expiresAt > Date.now())) {
               accounts.push({ email: p.email, accessToken: p.accessToken });
             }
           }
           
           if (updatedProfile) {
             localStorage.setItem("campus-life-os-profile", JSON.stringify(profile));
           }
        }
      }
      
      const lastSyncRaw = localStorage.getItem("campus-life-os-last-sync");
      if (lastSyncRaw) {
        lastSyncTimestamp = parseInt(lastSyncRaw, 10);
      }
    } catch (e) {
      console.error("Error preparing accounts for sync:", e);
    }

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts, lastSyncTimestamp }),
      });

      const data = await res.json();

      if (res.status === 401 || data.isExpired) {
        setSyncResult("Session expired. Signing out...");
        setTimeout(() => signOut({ callbackUrl: "/" }), 2000);
        return;
      }
      
      // Update the last sync timestamp on success
      localStorage.setItem("campus-life-os-last-sync", Math.floor(Date.now() / 1000).toString());

      if (data.tasks && data.tasks.length > 0) {
        const newTasks: Task[] = data.tasks.map((t: any) => ({
          id: t.id || Math.random().toString(),
          title: t.title,
          description: t.description,
          subjectCourse: t.subjectCourse,
          taskType: t.taskType,
          deadline: t.deadline,
          estimatedEffortHours: t.estimatedEffortHours,
          priority: t.priority,
          status: t.status,
          source: t.source,
          aiConfidence: t.aiConfidence,
        }));

        setTasks((prev) => {
          const existingIds = new Set(prev.map((t) => t.id));
          const filteredNew = newTasks.filter((t) => !existingIds.has(t.id));
          return [...filteredNew, ...prev];
        });
        setSyncResult(`Synced ${data.tasks.length} tasks from ${data.emailsScanned} emails`);
      } else {
        setSyncResult(data.message || "No new academic emails found");
      }
    } catch (err) {
      console.error("Sync error:", err);
      setSyncResult("Sync failed. Check console for details.");
    }

    setSyncing(false);
  }, [session]);

  // Stats
  const actionableTasks = tasks.filter(t => t.taskType !== "notice" && t.taskType !== "announcement");
  const filteredNotices = tasks.filter(t => t.taskType === "notice" || t.taskType === "announcement");

  const pendingCount = actionableTasks.filter((t) => t.status === "pending" || t.status === "overdue" || t.status === "in_progress").length;
  const completedCount = actionableTasks.filter((t) => t.status === "completed").length;
  const urgentCount = actionableTasks.filter(
    (t) =>
      (t.priority === "critical" || t.priority === "high") &&
      t.status !== "completed"
  ).length;
  const totalEffort = actionableTasks
    .filter((t) => t.status !== "completed")
    .reduce((s, t) => s + t.estimatedEffortHours, 0);

  const filteredTasks =
    filter === "active" ? actionableTasks.filter((t) => t.status !== "completed") : actionableTasks.filter((t) => t.status === filter);

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    const aDate = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bDate = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return aDate - bDate;
  });

  const toggleStatus = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus = task.status === "completed" ? "pending" : "completed";

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );

    if (session?.user?.email && !id.toString().startsWith("demo-")) {
      await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", id);
    }
  };

  const stats = [
    { label: "Pending", value: pendingCount, icon: Clock, color: "var(--color-warning)" },
    { label: "Urgent", value: urgentCount, icon: AlertTriangle, color: "var(--color-danger)" },
    { label: "Done", value: completedCount, icon: CheckCircle2, color: "var(--color-success)" },
    { label: "Effort", value: `${totalEffort}h`, icon: TrendingUp, color: "var(--color-info)" },
  ];

  const filters: { label: string; value: FilterType }[] = [
    { label: "Active", value: "active" as any },
    { label: "Pending", value: "pending" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const userName = displayName || session?.user?.name?.split(" ")[0] || "Student";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            {greeting}, {userName}
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {session
              ? session.user?.email
              : "Demo mode — sign in for live sync"}
          </p>
        </div>
        <button
          onClick={handleSync}
          className="btn-primary"
          disabled={syncing}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      {/* Sync Result */}
      {syncResult && (
        <div className="text-xs text-[var(--text-secondary)] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] animate-fade-in">
          {syncResult}
        </div>
      )}

      {/* Conflict Alerts */}
      <ConflictBanner conflicts={[]} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-up stagger-1">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                <span className="text-[11px] text-[var(--text-muted)]">
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-semibold text-[var(--text-primary)]">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Tasks */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                    filter === f.value
                      ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                      : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">
              {sortedTasks.length} tasks
            </span>
          </div>

          {/* Task List */}
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleStatus={toggleStatus}
              />
            ))}
            {sortedTasks.length === 0 && (
              <div className="text-center py-12 text-[var(--text-muted)]">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-25" />
                <p className="text-sm">No tasks found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Notice Feed */}
          {filteredNotices.length > 0 && (
            <div className="glass-card p-5 animate-fade-in-up stagger-1 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--color-info)]" />
                  <h2 className="text-sm font-medium text-[var(--text-primary)]">
                    Notices & Updates
                  </h2>
                </div>
                <span className="badge badge-low">{filteredNotices.length}</span>
              </div>
              <div className="space-y-3">
                {filteredNotices.map((notice) => (
                  <div key={notice.id} className="p-3 rounded-md bg-[var(--bg-surface)] border border-[var(--border)]">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-[13px] font-medium text-[var(--text-primary)]">{notice.title}</h3>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{notice.description}</p>
                    <div className="mt-2 text-[10px] text-[var(--accent)] font-medium">
                      Source: {notice.source}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Calendar Events Widget */}
          {calendarEvents.length > 0 && (
            <div className="glass-card p-5 animate-fade-in-up stagger-1 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--color-warning)]" />
                  <h2 className="text-sm font-medium text-[var(--text-primary)]">
                    Upcoming Schedule
                  </h2>
                </div>
                <span className="badge badge-medium">{calendarEvents.length}</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {calendarEvents.map((event) => {
                  const startDate = new Date(event.startTime);
                  const isToday = startDate.toDateString() === new Date().toDateString();
                  return (
                    <a
                      key={event.id}
                      href={event.link}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-3 rounded-md bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--accent)] transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-[13px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate pr-2">
                          {event.title}
                        </h3>
                        <span className={`text-[10px] whitespace-nowrap px-1.5 py-0.5 rounded-sm ${isToday ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'}`}>
                          {isToday ? "Today" : startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-[var(--text-muted)]">
                        <Clock className="w-3 h-3" />
                        <span>
                          {startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Burnout Predictor */}
          <div className="glass-card p-5 animate-fade-in-up stagger-2">
            <h3 className="text-xs font-medium text-[var(--text-muted)] mb-4 uppercase tracking-wide">
              Burnout Risk
            </h3>
            <BurnoutMeter
              score={burnout.score}
              level={burnout.level as "low" | "moderate" | "high"}
              size={140}
            />
            <div className="mt-4 space-y-1.5">
              {[
                { label: "Tasks (7d)", value: burnout.factors.taskCount },
                { label: "Effort", value: `${burnout.factors.totalEffort}h` },
                { label: "Urgent", value: burnout.factors.urgentCount, danger: true },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">{item.label}</span>
                  <span className={item.danger ? "text-[var(--color-danger)]" : "text-[var(--text-primary)]"}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Workload */}
          <div className="glass-card p-5 animate-fade-in-up stagger-3">
            <h3 className="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">
              Workload (14 Days)
            </h3>
            <WorkloadChart data={workloadData} />
          </div>
        </div>
      </div>
    </div>
  );
}
