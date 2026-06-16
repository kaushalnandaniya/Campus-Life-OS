"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { demoActivities, type Task } from "@/lib/demo-data";
import {
  CalendarDays,
  Sparkles,
  BookOpen,
  Dumbbell,
  Coffee,
  Moon,
  Loader2,
} from "lucide-react";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ScheduleBlock {
  time: string;
  title: string;
  type: "academic" | "personal" | "break" | "ai-suggested";
  duration: string;
  icon: React.ReactNode;
  course?: string;
}

function generateScheduleForDay(dayOffset: number, tasks: Task[]): ScheduleBlock[] {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const dayOfWeek = date.getDay();

  const blocks: ScheduleBlock[] = [];

  blocks.push({
    time: "06:00",
    title: "Wake Up",
    type: "personal",
    duration: "30 min",
    icon: <Coffee className="w-3.5 h-3.5" />,
  });

  const morningActivity = demoActivities.find(
    (a) => a.daysOfWeek.includes(dayOfWeek) && a.startTime < "08:00"
  );
  if (morningActivity) {
    blocks.push({
      time: morningActivity.startTime,
      title: morningActivity.title,
      type: "personal",
      duration: `${morningActivity.startTime} - ${morningActivity.endTime}`,
      icon: <Dumbbell className="w-3.5 h-3.5" />,
    });
  }

  blocks.push({
    time: "09:00",
    title: "Data Structures Lecture",
    type: "academic",
    duration: "1h",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    course: "DSA",
  });

  blocks.push({
    time: "10:15",
    title: "Mathematics III Lecture",
    type: "academic",
    duration: "1h",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    course: "Math III",
  });

  blocks.push({
    time: "11:30",
    title: "Break",
    type: "break",
    duration: "30 min",
    icon: <Coffee className="w-3.5 h-3.5" />,
  });

  blocks.push({
    time: "12:00",
    title: "DBMS Lab",
    type: "academic",
    duration: "2h",
    icon: <BookOpen className="w-3.5 h-3.5" />,
    course: "DBMS",
  });

  const urgentTasks = tasks.filter((t) => {
    const deadline = new Date(t.deadline);
    const diff = (deadline.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 3 && t.status !== "completed";
  });

  if (urgentTasks.length > 0) {
    blocks.push({
      time: "14:30",
      title: `Work on: ${urgentTasks[0].title}`,
      type: "ai-suggested",
      duration: `${Math.min(urgentTasks[0].estimatedEffortHours || 2, 2)}h`,
      icon: <Sparkles className="w-3.5 h-3.5" />,
      course: urgentTasks[0].subjectCourse,
    });
  }

  if (urgentTasks.length > 1) {
    blocks.push({
      time: "17:00",
      title: `Work on: ${urgentTasks[1].title}`,
      type: "ai-suggested",
      duration: `${Math.min(urgentTasks[1].estimatedEffortHours || 2, 2)}h`,
      icon: <Sparkles className="w-3.5 h-3.5" />,
      course: urgentTasks[1].subjectCourse,
    });
  }

  const eveningActivity = demoActivities.find(
    (a) =>
      a.daysOfWeek.includes(dayOfWeek) &&
      a.startTime >= "17:00" &&
      a.startTime < "21:00"
  );
  if (eveningActivity) {
    blocks.push({
      time: eveningActivity.startTime,
      title: eveningActivity.title,
      type: "personal",
      duration: `${eveningActivity.startTime} - ${eveningActivity.endTime}`,
      icon: <Dumbbell className="w-3.5 h-3.5" />,
    });
  }

  blocks.push({
    time: "23:00",
    title: "Sleep",
    type: "personal",
    duration: "7h",
    icon: <Moon className="w-3.5 h-3.5" />,
  });

  return blocks.sort((a, b) => a.time.localeCompare(b.time));
}

export default function SchedulePage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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
      }
      setLoading(false);
    };

    fetchTasks();
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
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Smart Schedule
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          AI-generated daily plan balancing academics with personal life
        </p>
      </div>

      <div className="text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] inline-flex items-center gap-1.5 animate-fade-in">
        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
        Blocks marked with AI are suggested based on upcoming deadlines
      </div>

      <div className="space-y-4">
        {[0, 1, 2].map((offset) => {
          const date = new Date(today);
          date.setDate(date.getDate() + offset);
          const blocks = generateScheduleForDay(offset, tasks);
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
                  {blocks.length} blocks
                </span>
              </div>

              <div className="relative ml-3">
                <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[var(--border)]" />

                <div className="space-y-2.5">
                  {blocks.map((block, i) => (
                    <div key={i} className="flex items-start gap-3 relative">
                      <div
                        className="w-3 h-3 rounded-full border-[1.5px] bg-[var(--bg-primary)] flex-shrink-0 mt-1 z-10"
                        style={{
                          borderColor:
                            block.type === "ai-suggested"
                              ? "var(--accent)"
                              : block.type === "academic"
                              ? "var(--color-info)"
                              : block.type === "break"
                              ? "var(--text-muted)"
                              : "var(--color-success)",
                        }}
                      />

                      <div
                        className={`flex-1 p-2.5 rounded-md border transition-colors ${
                          block.type === "ai-suggested"
                            ? "bg-[var(--accent-dim)] border-[var(--accent-border)]"
                            : block.type === "break"
                            ? "bg-[var(--bg-surface)] border-[var(--border)] opacity-50"
                            : "bg-[var(--bg-surface)] border-[var(--border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--text-muted)]">
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
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {block.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
