"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { getWorkloadData, type Task } from "@/lib/demo-data";
import { CalendarEvent } from "@/lib/scheduler";
import WorkloadChart from "@/components/WorkloadChart";
import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";

export default function ForecastPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_email", userEmail)
        .order("deadline", { ascending: true });

      if (!error && data) {
        setTasks(data.map((t) => ({
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
        })));
      }
    };

    const fetchCalendar = async () => {
      try {
        const res = await fetch("/api/calendar");
        const calData = await res.json();
        if (calData.events) setCalendarEvents(calData.events);
      } catch (err) {}
    };

    const fetchActivities = async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*")
        .eq("user_email", userEmail);

      if (!error && data) {
        setActivities(data.map((a: any) => ({
          id: a.id,
          title: a.title,
          type: "personal",
          daysOfWeek: a.days_of_week || [],
          startTime: a.start_time,
          endTime: a.end_time,
        })));
      }
    };

    fetchTasks();
    fetchCalendar();
    fetchActivities();
  }, [session]);

  const data = getWorkloadData(tasks, calendarEvents, activities);
  const heaviest = data.reduce((max, d) => (d.total > max.total ? d : max), data[0]);
  const deadlineDays = data.filter((d) => d.taskCount > 0);

  return (
    <div className="space-y-5">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Workload Forecast
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          AI-predicted workload for the next 14 days
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in-up stagger-1">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--color-info)]" />
            <span className="text-[11px] text-[var(--text-muted)]">Total Workload</span>
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            {data.reduce((s, d) => s + d.total, 0).toFixed(0)}h
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-danger)]" />
            <span className="text-[11px] text-[var(--text-muted)]">Heaviest Day</span>
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            {heaviest.date}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">{heaviest.total}h of tasks</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[var(--color-warning)]" />
            <span className="text-[11px] text-[var(--text-muted)]">Deadline Days</span>
          </div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">
            {deadlineDays.length}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-5 animate-fade-in-up stagger-2">
        <h3 className="text-xs font-medium text-[var(--text-muted)] mb-4 uppercase tracking-wide">
          14-Day Overview
        </h3>
        <WorkloadChart data={data} />
      </div>

      {/* Breakdown */}
      <div className="glass-card p-5 animate-fade-in-up stagger-3">
        <h3 className="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">
          Daily Breakdown
        </h3>
        <div className="space-y-1.5">
          {data.map((day) => {
            const barWidth = Math.min((day.total / 15) * 100, 100);
            const barColor =
              day.total > 8
                ? "var(--color-danger)"
                : day.total > 4
                ? "var(--color-warning)"
                : "var(--color-success)";

            return (
              <div key={day.date} className="flex items-center gap-3">
                <span className="text-[11px] text-[var(--text-muted)] w-20 flex-shrink-0">
                  {day.day} {day.date}
                </span>
                <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-500"
                    style={{ width: `${barWidth}%`, backgroundColor: barColor, opacity: 0.6 }}
                  />
                  {day.taskCount > 0 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
                      {day.taskCount} deadline{day.taskCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium text-[var(--text-secondary)] w-8 text-right">
                  {day.total}h
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
