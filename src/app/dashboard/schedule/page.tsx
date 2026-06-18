"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { type Task } from "@/lib/demo-data";
import {
  CalendarDays,
  Sparkles,
  BookOpen,
  Dumbbell,
  Loader2,
} from "lucide-react";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BaselineEvent {
  id: string;
  title: string;
  type: "academic" | "personal";
  daysOfWeek: number[]; // 0=Sun, 1=Mon, etc.
  startTime: string; // "09:00"
  endTime: string; // "10:30"
  course?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  sourceAccount: string;
}

interface ScheduleBlock {
  id: string;
  time: string;
  endTimeStr: string;
  title: string;
  type: "academic" | "personal" | "break" | "ai-suggested" | "calendar";
  duration: string;
  icon?: React.ReactNode;
  course?: string;
  color?: string;
}

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function generateSmartSchedule(
  targetDate: Date,
  baselineRoutine: BaselineEvent[],
  calendarEvents: CalendarEvent[],
  tasks: Task[]
): ScheduleBlock[] {
  const dayOfWeek = targetDate.getDay();
  const dateString = targetDate.toDateString();

  const blocks: ScheduleBlock[] = [];

  // 1. Add Baseline Events for this day
  const todaysBaseline = baselineRoutine.filter((e) =>
    e.daysOfWeek.includes(dayOfWeek)
  );
  todaysBaseline.forEach((e) => {
    blocks.push({
      id: e.id,
      time: e.startTime,
      endTimeStr: e.endTime,
      title: e.title,
      type: e.type,
      duration: formatDuration(timeToMinutes(e.endTime) - timeToMinutes(e.startTime)),
      course: e.course,
    });
  });

  // 2. Add Google Calendar Events for this day
  const todaysCalendarEvents = calendarEvents.filter((e) => {
    const d = new Date(e.startTime);
    return d.toDateString() === dateString;
  });

  todaysCalendarEvents.forEach((e) => {
    const startMins = new Date(e.startTime).getHours() * 60 + new Date(e.startTime).getMinutes();
    const endMins = new Date(e.endTime).getHours() * 60 + new Date(e.endTime).getMinutes();
    
    // Skip all day events or multi-day for simplicity in this visual schedule
    if (endMins - startMins <= 0) return;

    blocks.push({
      id: e.id,
      time: minutesToTime(startMins),
      endTimeStr: minutesToTime(endMins),
      title: e.title,
      type: "calendar",
      duration: formatDuration(endMins - startMins),
    });
  });

  // 3. Find Free Gaps & Inject AI Tasks
  // We assume waking hours are 08:00 to 22:00
  const WAKE_TIME = 8 * 60;
  const SLEEP_TIME = 22 * 60;

  // Sort blocks chronologically
  blocks.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  let currentMins = WAKE_TIME;
  const freeGaps: { start: number; end: number }[] = [];

  for (const block of blocks) {
    const blockStart = timeToMinutes(block.time);
    const blockEnd = timeToMinutes(block.endTimeStr);

    if (blockStart > currentMins) {
      freeGaps.push({ start: currentMins, end: blockStart });
    }
    currentMins = Math.max(currentMins, blockEnd);
  }

  if (currentMins < SLEEP_TIME) {
    freeGaps.push({ start: currentMins, end: SLEEP_TIME });
  }

  // Inject AI Tasks
  const urgentTasks = tasks.filter((t) => {
    if (t.status === "completed") return false;
    if (!t.deadline) return true; // Include non-deadline tasks too if we need filler
    const deadline = new Date(t.deadline);
    const diff = (deadline.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 5; // Next 5 days
  });

  // Sort tasks by priority and deadline
  urgentTasks.sort((a, b) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    return new Date(a.deadline || "2099").getTime() - new Date(b.deadline || "2099").getTime();
  });

  // We limit to 2 AI blocks per day to avoid burnout
  let aiBlocksInjected = 0;

  for (const task of urgentTasks) {
    if (aiBlocksInjected >= 2) break;

    const requiredEffort = Math.min(task.estimatedEffortHours || 1.5, 2) * 60; // Max 2 hours per sitting

    // Find a gap big enough
    const gapIndex = freeGaps.findIndex((g) => g.end - g.start >= requiredEffort);

    if (gapIndex !== -1) {
      const gap = freeGaps[gapIndex];
      
      blocks.push({
        id: `ai-${task.id}-${dateString}`,
        time: minutesToTime(gap.start),
        endTimeStr: minutesToTime(gap.start + requiredEffort),
        title: `Study: ${task.title}`,
        type: "ai-suggested",
        duration: formatDuration(requiredEffort),
        course: task.subjectCourse,
      });

      // Update gap
      freeGaps[gapIndex].start += requiredEffort;
      aiBlocksInjected++;
    }
  }

  // Set icons
  blocks.forEach((b) => {
    if (b.type === "academic") b.icon = <BookOpen className="w-3.5 h-3.5" />;
    else if (b.type === "personal") b.icon = <Dumbbell className="w-3.5 h-3.5" />;
    else if (b.type === "ai-suggested") b.icon = <Sparkles className="w-3.5 h-3.5" />;
    else if (b.type === "calendar") b.icon = <CalendarDays className="w-3.5 h-3.5" />;
  });

  // Re-sort with AI blocks included
  return blocks.sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

export default function SchedulePage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [baselineRoutine, setBaselineRoutine] = useState<BaselineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const fetchData = async () => {
      // Fetch Supabase Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_email", userEmail)
        .order("deadline", { ascending: true });

      if (!tasksError && tasksData) {
        setTasks(
          tasksData.map((t) => ({
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
          }))
        );
      }

      // Fetch Supabase Activities (Baseline Routine)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from("activities")
        .select("*")
        .eq("user_email", userEmail);

      if (!activitiesError && activitiesData) {
        setBaselineRoutine(
          activitiesData.map((a: any) => ({
            id: a.id,
            title: a.title,
            type: "personal", // We'll treat all activities as personal for color coding
            daysOfWeek: a.days_of_week || [],
            startTime: a.start_time,
            endTime: a.end_time,
          }))
        );
      }

      // Fetch Calendar Events
      try {
        const res = await fetch("/api/calendar");
        const calData = await res.json();
        if (calData.events) {
          setCalendarEvents(calData.events);
        }
      } catch (err) {
        console.error("Failed to fetch calendar", err);
      }

      setLoading(false);
    };

    fetchData();
  }, [session]);

  const today = new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between animate-fade-in-up">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Smart Schedule
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Merges your Routine, Google Calendar, and AI Study Blocks
          </p>
        </div>
      </div>

      <div className="text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] inline-flex items-center gap-1.5 animate-fade-in">
        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
        Blocks marked with AI are dynamically inserted into your free time based on upcoming deadlines
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((offset) => {
          const date = new Date(today);
          date.setDate(date.getDate() + offset);
          const blocks = generateSmartSchedule(date, baselineRoutine, calendarEvents, tasks);
          const label =
            offset === 0
              ? "Today"
              : offset === 1
              ? "Tomorrow"
              : `${dayNames[date.getDay()]}, ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

          return (
            <div key={offset} className="glass-card p-5 animate-fade-in-up stagger-${offset + 1}">
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-medium text-[var(--text-primary)]">
                  {label}
                </h2>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {blocks.length} events
                </span>
              </div>

              <div className="relative ml-3">
                <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[var(--border)]" />

                <div className="space-y-2.5">
                  {blocks.length === 0 ? (
                    <div className="pl-6 text-xs text-[var(--text-muted)] py-2">
                       No events or AI suggestions for this day. Enjoy your free time!
                    </div>
                  ) : (
                    blocks.map((block, i) => (
                      <div key={i} className="flex items-start gap-3 relative">
                        <div
                          className="w-3 h-3 rounded-full border-[1.5px] bg-[var(--bg-primary)] flex-shrink-0 mt-1 z-10"
                          style={{
                            borderColor:
                              block.type === "ai-suggested"
                                ? "var(--accent)"
                                : block.type === "calendar"
                                ? "var(--color-warning)"
                                : block.type === "academic"
                                ? "var(--color-info)"
                                : "var(--color-success)",
                          }}
                        />

                        <div
                          className={`flex-1 p-2.5 rounded-md border transition-colors ${
                            block.type === "ai-suggested"
                              ? "bg-[var(--accent-dim)] border-[var(--accent-border)]"
                              : block.type === "calendar"
                              ? "bg-[var(--bg-surface)] border-[var(--border)] border-l-[3px] border-l-[var(--color-warning)]"
                              : "bg-[var(--bg-surface)] border-[var(--border)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={block.type === "calendar" ? "text-[var(--color-warning)]" : "text-[var(--text-muted)]"}>
                                {block.icon}
                              </span>
                              <span className="text-[13px] font-medium text-[var(--text-primary)]">
                                {block.title}
                              </span>
                              {block.type === "ai-suggested" && (
                                <span className="text-[9px] bg-[var(--accent-dim)] text-[var(--accent)] px-1.5 py-0.5 rounded font-medium">
                                  AI
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {block.course && (
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  {block.course}
                                </span>
                              )}
                              <span className="text-[11px] text-[var(--text-muted)] font-medium">
                                {block.time} - {block.endTimeStr}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
