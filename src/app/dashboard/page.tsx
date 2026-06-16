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
} from "lucide-react";

type FilterType = "all" | "pending" | "in_progress" | "completed";

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [filter, setFilter] = useState<FilterType>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const workloadData = getWorkloadData(tasks);
  const burnout = calculateBurnoutScore(tasks);

  // Load tasks from Supabase on mount
  useEffect(() => {
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
        }));
        setTasks(formattedTasks);
      } else {
        setTasks([]);
      }
    };

    fetchTasks();
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
        const profile = JSON.parse(profileRaw);
        if (profile.personalEmails) {
           profile.personalEmails.forEach((p: any) => {
             // Only include tokens that are present and not expired
             if (p.accessToken && (!p.expiresAt || p.expiresAt > Date.now())) {
               accounts.push({ email: p.email, accessToken: p.accessToken });
             } else {
               console.warn(`Token for ${p.email} is expired or missing. Needs re-auth.`);
             }
           });
        }
      }
      
      const lastSyncRaw = localStorage.getItem("campus-life-os-last-sync");
      if (lastSyncRaw) {
        lastSyncTimestamp = parseInt(lastSyncRaw, 10);
      }
    } catch {}

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
  const actionableTasks = tasks.filter(t => t.taskType !== "notice");
  const filteredNotices = tasks.filter(t => t.taskType === "notice");

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
    filter === "all" ? actionableTasks : actionableTasks.filter((t) => t.status === filter);

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
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const userName = session?.user?.name?.split(" ")[0] || "Student";

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
      <ConflictBanner conflicts={demoConflicts} />

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
