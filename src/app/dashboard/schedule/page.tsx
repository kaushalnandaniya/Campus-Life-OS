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
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  List
} from "lucide-react";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface BaselineEvent {
  id: string;
  title: string;
  type: "academic" | "personal";
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  course?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  sourceAccount: string;
}

interface ScheduleBlock {
  id: string;
  time: string;
  endTimeStr: string;
  startMins: number;
  endMins: number;
  title: string;
  type: "academic" | "personal" | "break" | "ai-suggested" | "calendar";
  duration: string;
  icon?: React.ReactNode;
  course?: string;
}

const HOURS_START = 6;
const HOURS_END = 24;
const PIXELS_PER_MINUTE = 1.2; 

function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
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

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function getStartOfMonth(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

// Global Schedule Generator over a date range
function generateSmartScheduleRange(
  startDate: Date,
  endDate: Date,
  baselineRoutine: BaselineEvent[],
  calendarEvents: CalendarEvent[],
  tasks: Task[]
): Record<string, ScheduleBlock[]> {
  const scheduleMap: Record<string, ScheduleBlock[]> = {};
  
  // Clone tasks so we can track which get scheduled
  let unscheduledTasks = [...tasks].filter(t => t.status !== "completed").sort((a, b) => {
    if (a.priority === "high" && b.priority !== "high") return -1;
    if (a.priority !== "high" && b.priority === "high") return 1;
    return new Date(a.deadline || "2099").getTime() - new Date(b.deadline || "2099").getTime();
  });

  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  while (currentDate <= end) {
    const dateStr = currentDate.toDateString();
    const dayOfWeek = currentDate.getDay();
    const blocks: ScheduleBlock[] = [];

    // 1. Baseline Routine
    const todaysBaseline = baselineRoutine.filter((e) => e.daysOfWeek.includes(dayOfWeek));
    todaysBaseline.forEach((e) => {
      const startMins = timeToMinutes(e.startTime);
      const endMins = timeToMinutes(e.endTime);
      blocks.push({
        id: e.id,
        time: e.startTime,
        endTimeStr: e.endTime,
        startMins,
        endMins,
        title: e.title,
        type: e.type,
        duration: formatDuration(endMins - startMins),
        course: e.course,
      });
    });

    // 2. Google Calendar
    const todaysCalendarEvents = calendarEvents.filter((e) => {
      const d = new Date(e.startTime);
      return d.toDateString() === dateStr;
    });

    todaysCalendarEvents.forEach((e) => {
      const dStart = new Date(e.startTime);
      const dEnd = new Date(e.endTime);
      const startMins = dStart.getHours() * 60 + dStart.getMinutes();
      const endMins = dEnd.getHours() * 60 + dEnd.getMinutes();
      
      if (endMins - startMins <= 0) return; // skip all day

      blocks.push({
        id: e.id,
        time: minutesToTime(startMins),
        endTimeStr: minutesToTime(endMins),
        startMins,
        endMins,
        title: e.title,
        type: "calendar",
        duration: formatDuration(endMins - startMins),
      });
    });

    // 3. Find Free Gaps
    blocks.sort((a, b) => a.startMins - b.startMins);
    
    const WAKE_TIME = 8 * 60;
    const SLEEP_TIME = 22 * 60;
    let currentMins = WAKE_TIME;
    const freeGaps: { start: number; end: number }[] = [];

    for (const block of blocks) {
      if (block.startMins > currentMins) {
        freeGaps.push({ start: currentMins, end: block.startMins });
      }
      currentMins = Math.max(currentMins, block.endMins);
    }
    if (currentMins < SLEEP_TIME) {
      freeGaps.push({ start: currentMins, end: SLEEP_TIME });
    }

    // 4. Inject AI
    let aiBlocksInjected = 0;
    const stillUnscheduled = [];
    
    for (const task of unscheduledTasks) {
      const deadline = new Date(task.deadline || "2099");
      const diff = (deadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
      
      let scheduledThisTask = false;

      if (aiBlocksInjected < 2 && diff >= 0 && diff <= 7) {
        const requiredEffort = Math.min(task.estimatedEffortHours || 1.5, 2) * 60;
        const gapIndex = freeGaps.findIndex((g) => g.end - g.start >= requiredEffort);
        
        if (gapIndex !== -1) {
          const gap = freeGaps[gapIndex];
          blocks.push({
            id: `ai-${task.id}-${dateStr}`,
            time: minutesToTime(gap.start),
            endTimeStr: minutesToTime(gap.start + requiredEffort),
            startMins: gap.start,
            endMins: gap.start + requiredEffort,
            title: `Study: ${task.title}`,
            type: "ai-suggested",
            duration: formatDuration(requiredEffort),
            course: task.subjectCourse,
          });
          freeGaps[gapIndex].start += requiredEffort;
          aiBlocksInjected++;
          scheduledThisTask = true;
        }
      }

      if (!scheduledThisTask) {
        stillUnscheduled.push(task);
      }
    }
    
    unscheduledTasks = stillUnscheduled; // Carry over uncompleted tasks to next day

    // Icons
    blocks.forEach((b) => {
      if (b.type === "academic") b.icon = <BookOpen className="w-3 h-3" />;
      else if (b.type === "personal") b.icon = <Dumbbell className="w-3 h-3" />;
      else if (b.type === "ai-suggested") b.icon = <Sparkles className="w-3 h-3" />;
      else if (b.type === "calendar") b.icon = <CalendarDays className="w-3 h-3" />;
    });

    scheduleMap[dateStr] = blocks.sort((a, b) => a.startMins - b.startMins);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return scheduleMap;
}

export default function SchedulePage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [baselineRoutine, setBaselineRoutine] = useState<BaselineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [viewType, setViewType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pushingToGCal, setPushingToGCal] = useState(false);

  const handlePushToGCal = async (scheduleMap: Record<string, ScheduleBlock[]>) => {
    if (pushingToGCal) return;
    setPushingToGCal(true);
    
    try {
      const payloadBlocks: any[] = [];
      Object.entries(scheduleMap).forEach(([dateStr, blocks]) => {
        blocks.forEach(b => {
          if (b.type !== "calendar") { // Don't push events already from GCal
             const baseDate = new Date(dateStr);
             const startHour = Math.floor(b.startMins / 60);
             const startMin = b.startMins % 60;
             const endHour = Math.floor(b.endMins / 60);
             const endMin = b.endMins % 60;
             
             const startTime = new Date(baseDate);
             startTime.setHours(startHour, startMin, 0, 0);
             
             const endTime = new Date(baseDate);
             endTime.setHours(endHour, endMin, 0, 0);
             
             payloadBlocks.push({
               title: b.title,
               type: b.type,
               startTime: startTime.toISOString(),
               endTime: endTime.toISOString()
             });
          }
        });
      });

      const res = await fetch("/api/calendar/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: payloadBlocks })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Successfully synced ${data.pushedCount} smart blocks to your Google Calendar!`);
      } else {
        alert(`Failed to sync: ${data.error}`);
      }
    } catch (e: any) {
      console.error("Client side push error:", e);
      alert(`Error syncing to Google Calendar: ${e.message}`);
    } finally {
      setPushingToGCal(false);
    }
  };

  useEffect(() => {
    const userEmail = session?.user?.email;
    if (!userEmail) return;

    const fetchData = async () => {
      const { data: tasksData } = await supabase.from("tasks").select("*").eq("user_email", userEmail);
      if (tasksData) {
        setTasks(tasksData.map((t: any) => ({
          id: t.id, 
          title: t.title, 
          description: t.description || "",
          subjectCourse: t.subject_course, 
          taskType: t.task_type || "assignment",
          deadline: t.deadline,
          estimatedEffortHours: t.estimated_effort_hours, 
          priority: t.priority, 
          status: t.status,
          source: t.source || "manual",
          aiConfidence: t.ai_confidence || 100,
          createdAt: t.created_at || new Date().toISOString()
        })));
      }

      const { data: actData } = await supabase.from("activities").select("*").eq("user_email", userEmail);
      if (actData) {
        setBaselineRoutine(actData.map((a: any) => ({
          id: a.id, title: a.title, type: "personal", daysOfWeek: a.days_of_week || [],
          startTime: a.start_time, endTime: a.end_time
        })));
      }

      try {
        const res = await fetch("/api/calendar");
        const calData = await res.json();
        if (calData.events) setCalendarEvents(calData.events);
      } catch (e) {}

      setLoading(false);
    };

    fetchData();
  }, [session]);

  const changeDate = (amount: number) => {
    const d = new Date(currentDate);
    if (viewType === "daily") d.setDate(d.getDate() + amount);
    if (viewType === "weekly") d.setDate(d.getDate() + amount * 7);
    if (viewType === "monthly") d.setMonth(d.getMonth() + amount);
    setCurrentDate(d);
  };

  const getTimelineScale = () => {
    const hours = [];
    for (let i = HOURS_START; i <= HOURS_END; i++) {
      const label = i === 12 ? "12 PM" : i > 12 ? `${i - 12} PM` : `${i} AM`;
      hours.push(<div key={i} className="text-[10px] text-[var(--text-muted)] h-[72px] relative -top-2 pr-2 text-right w-12">{label}</div>);
    }
    return hours;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" /></div>;
  }

  // Generate Data for View
  let startDate = new Date(currentDate);
  let endDate = new Date(currentDate);
  
  if (viewType === "weekly") {
    startDate = getStartOfWeek(currentDate);
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
  } else if (viewType === "monthly") {
    startDate = getStartOfMonth(currentDate);
    startDate = getStartOfWeek(startDate); // pad beginning
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41); // 6 weeks total
  }

  const scheduleMap = generateSmartScheduleRange(startDate, endDate, baselineRoutine, calendarEvents, tasks);

  const renderEventBlock = (block: ScheduleBlock) => {
    const top = (block.startMins - HOURS_START * 60) * PIXELS_PER_MINUTE;
    const height = (block.endMins - block.startMins) * PIXELS_PER_MINUTE;

    let bgClass = "bg-[var(--bg-surface)] border-[var(--border)]";
    let accentColor = "var(--text-muted)";
    
    if (block.type === "ai-suggested") {
      bgClass = "bg-[var(--accent-dim)] border-[var(--accent-border)] text-[var(--accent)]";
      accentColor = "var(--accent)";
    } else if (block.type === "calendar") {
      bgClass = "bg-[var(--bg-surface)] border-l-2 border-l-[var(--color-warning)] border-[var(--border)]";
      accentColor = "var(--color-warning)";
    } else if (block.type === "academic") {
      bgClass = "bg-[var(--color-info-dim)] border-[var(--color-info)] opacity-80 text-[var(--text-primary)]";
      accentColor = "var(--color-info)";
    }

    return (
      <div
        key={block.id}
        className={`absolute left-1 right-1 rounded-md border p-1.5 overflow-hidden shadow-sm transition-all hover:z-10 hover:shadow-md ${bgClass}`}
        style={{ top: `${top}px`, height: `${Math.max(height, 20)}px` }}
      >
        <div className="flex items-start gap-1">
          <div className="mt-0.5" style={{ color: accentColor }}>{block.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold truncate leading-tight">{block.title}</div>
            {height > 30 && (
              <div className="text-[9px] opacity-70 truncate mt-0.5">
                {block.time} - {block.endTimeStr}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDailyView = () => {
    const blocks = scheduleMap[currentDate.toDateString()] || [];
    return (
      <div className="glass-card flex animate-fade-in overflow-hidden border border-[var(--border)]">
        <div className="bg-[var(--bg-elevated)] border-r border-[var(--border)] pt-4">
          {getTimelineScale()}
        </div>
        <div className="flex-1 relative min-h-[1000px] bg-[var(--bg-card)]">
          {/* Grid lines */}
          {Array.from({ length: HOURS_END - HOURS_START + 1 }).map((_, i) => (
             <div key={i} className="absolute left-0 right-0 border-t border-[var(--border)] opacity-30" style={{ top: `${i * 60 * PIXELS_PER_MINUTE}px` }} />
          ))}
          {blocks.map(renderEventBlock)}
        </div>
      </div>
    );
  };

  const renderWeeklyView = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    return (
      <div className="glass-card flex flex-col animate-fade-in border border-[var(--border)] overflow-x-auto">
        {/* Header */}
        <div className="flex ml-12 border-b border-[var(--border)]">
          {days.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={i} className="flex-1 text-center py-2 min-w-[100px] border-l border-[var(--border)] bg-[var(--bg-elevated)]">
                <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{dayNames[d.getDay()]}</div>
                <div className={`text-sm font-medium ${isToday ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        {/* Body */}
        <div className="flex relative min-h-[1000px]">
          <div className="bg-[var(--bg-elevated)] pt-4 z-10 sticky left-0">
            {getTimelineScale()}
          </div>
          <div className="flex flex-1 relative bg-[var(--bg-card)]">
             {/* Horizontal lines across all days */}
             {Array.from({ length: HOURS_END - HOURS_START + 1 }).map((_, i) => (
                <div key={i} className="absolute left-0 right-0 border-t border-[var(--border)] opacity-30 w-full" style={{ top: `${i * 60 * PIXELS_PER_MINUTE}px` }} />
             ))}
             {/* Day Columns */}
             {days.map((d, i) => {
               const blocks = scheduleMap[d.toDateString()] || [];
               return (
                 <div key={i} className="flex-1 relative min-w-[100px] border-l border-[var(--border)]">
                   {blocks.map(renderEventBlock)}
                 </div>
               );
             })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthlyView = () => {
    const days = [];
    let cur = new Date(startDate);
    for (let i = 0; i < 42; i++) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    return (
      <div className="glass-card animate-fade-in border border-[var(--border)] flex flex-col">
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
          {dayNames.map(d => (
             <div key={d} className="py-2 text-center text-[10px] font-medium text-[var(--text-muted)] uppercase">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 grid-rows-6 flex-1 bg-[var(--border)] gap-px">
           {days.map((d, i) => {
             const isCurrentMonth = d.getMonth() === currentDate.getMonth();
             const isToday = d.toDateString() === new Date().toDateString();
             const blocks = scheduleMap[d.toDateString()] || [];
             
             return (
               <div key={i} className={`min-h-[100px] bg-[var(--bg-card)] p-1 ${!isCurrentMonth ? "opacity-40" : ""}`}>
                  <div className={`text-[11px] font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-[var(--accent)] text-white" : "text-[var(--text-secondary)]"}`}>
                    {d.getDate()}
                  </div>
                  <div className="space-y-1">
                    {blocks.slice(0, 4).map(b => (
                       <div key={b.id} className="text-[8px] truncate px-1 rounded-sm bg-[var(--bg-surface)] border border-[var(--border)] flex items-center gap-1">
                         <span className={b.type === 'ai-suggested' ? 'text-[var(--accent)]' : b.type === 'calendar' ? 'text-[var(--color-warning)]' : 'text-[var(--color-info)]'}>
                           •
                         </span>
                         {b.title}
                       </div>
                    ))}
                    {blocks.length > 4 && (
                       <div className="text-[8px] text-[var(--text-muted)] px-1">+{blocks.length - 4} more</div>
                    )}
                  </div>
               </div>
             );
           })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between animate-fade-in-up gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Smart Schedule</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Visual Planner with AI Block Injection</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-lg">
            <button onClick={() => setViewType("daily")} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${viewType === "daily" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Day</button>
            <button onClick={() => setViewType("weekly")} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${viewType === "weekly" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Week</button>
            <button onClick={() => setViewType("monthly")} className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-colors ${viewType === "monthly" ? "bg-[var(--accent-dim)] text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>Month</button>
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] p-1 rounded-lg">
            <button onClick={() => changeDate(-1)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-[12px] font-medium text-[var(--text-primary)] min-w-[120px] text-center">
              {viewType === "daily" && currentDate.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' })}
              {viewType === "weekly" && `${startDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}`}
              {viewType === "monthly" && currentDate.toLocaleDateString("en-US", { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => changeDate(1)} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <button 
            onClick={() => handlePushToGCal(scheduleMap)}
            disabled={pushingToGCal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md bg-[rgba(96,165,250,0.1)] text-[var(--color-info)] border border-[rgba(96,165,250,0.2)] hover:bg-[rgba(96,165,250,0.2)] transition-colors"
          >
            {pushingToGCal ? <span className="animate-spin text-lg leading-none mt-[-2px]">↻</span> : <Sparkles className="w-3.5 h-3.5" />}
            {pushingToGCal ? "Syncing..." : "Sync to GCal"}
          </button>
        </div>
      </div>

      <div className="text-xs text-[var(--text-muted)] px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] inline-flex items-center gap-1.5 animate-fade-in">
        <Sparkles className="w-3 h-3 text-[var(--accent)]" />
        AI correctly interweaves your Tasks between your real Calendar Events and Activities.
      </div>

      {viewType === "daily" && renderDailyView()}
      {viewType === "weekly" && renderWeeklyView()}
      {viewType === "monthly" && renderMonthlyView()}
    </div>
  );
}
