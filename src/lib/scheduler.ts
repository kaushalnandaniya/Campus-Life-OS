import { type Task } from "@/lib/demo-data";
import React from "react";
import { BookOpen, Dumbbell, Sparkles, CalendarDays } from "lucide-react";

export interface BaselineEvent {
  id: string;
  title: string;
  type: "academic" | "personal";
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  course?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  sourceAccount: string;
}

export interface ScheduleBlock {
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

export const defaultBaselineRoutine: BaselineEvent[] = [
  { id: "b1", title: "Sleep", type: "personal", daysOfWeek: [0, 1, 2, 3, 4, 5, 6], startTime: "23:00", endTime: "07:00" },
  { id: "b2", title: "Morning Prep", type: "personal", daysOfWeek: [1, 2, 3, 4, 5], startTime: "07:00", endTime: "08:30" },
  { id: "b3", title: "Gym", type: "personal", daysOfWeek: [1, 3, 5], startTime: "17:00", endTime: "18:30" },
  { id: "b4", title: "Data Structures", type: "academic", course: "CS201", daysOfWeek: [1, 3], startTime: "10:00", endTime: "11:30" },
  { id: "b5", title: "Physics Lab", type: "academic", course: "PH102", daysOfWeek: [2], startTime: "14:00", endTime: "17:00" },
];

export function timeToMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function formatDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function getStartOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function getStartOfMonth(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

export function generateSmartScheduleRange(
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

    // 1. Google Calendar (Highest Priority)
    const todaysCalendarEvents = calendarEvents.filter((e) => {
      const d = new Date(e.startTime);
      return d.toDateString() === dateStr;
    });

    const parsedCalendarEvents = todaysCalendarEvents.map((e) => {
      const dStart = new Date(e.startTime);
      const dEnd = new Date(e.endTime);
      return {
        startMins: dStart.getHours() * 60 + dStart.getMinutes(),
        endMins: dEnd.getHours() * 60 + dEnd.getMinutes(),
        event: e,
      };
    }).filter(e => {
      let dur = e.endMins - e.startMins;
      if (dur < 0) dur += 1440;
      return dur > 0;
    });

    parsedCalendarEvents.forEach(pe => {
      let dur = pe.endMins - pe.startMins;
      if (dur < 0) dur += 1440;
      blocks.push({
        id: pe.event.id,
        time: minutesToTime(pe.startMins),
        endTimeStr: minutesToTime(pe.endMins),
        startMins: pe.startMins,
        endMins: pe.endMins,
        title: pe.event.title,
        type: "calendar",
        duration: formatDuration(dur),
      });
    });

    // 2. Baseline Routine (Second Priority)
    const todaysBaseline = baselineRoutine.filter((e) => e.daysOfWeek.includes(dayOfWeek));
    todaysBaseline.forEach((e) => {
      const startMins = timeToMinutes(e.startTime);
      const endMins = timeToMinutes(e.endTime);
      
      // Only schedule routine if it DOES NOT overlap with any Google Calendar events
      const overlapsWithGCal = parsedCalendarEvents.some(ce => 
        (startMins < ce.endMins && endMins > ce.startMins)
      );

      if (!overlapsWithGCal) {
        let dur = endMins - startMins;
        if (dur < 0) dur += 1440;
        blocks.push({
          id: e.id,
          time: e.startTime,
          endTimeStr: e.endTime,
          startMins,
          endMins,
          title: e.title,
          type: e.type,
          duration: formatDuration(dur),
          course: e.course,
        });
      }
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
        const remainingEffortHours = task.estimatedEffortHours || 1.5;
        // Schedule up to 2 hours at a time to prevent burnout
        const requiredEffort = Math.min(remainingEffortHours, 2) * 60;
        
        const gapIndex = freeGaps.findIndex((g) => g.end - g.start >= requiredEffort);
        
        if (gapIndex !== -1) {
          const gap = freeGaps[gapIndex];
          blocks.push({
            id: `ai-${task.id}-${dateStr}-${aiBlocksInjected}`,
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
          
          // Deduct scheduled time
          task.estimatedEffortHours = remainingEffortHours - (requiredEffort / 60);
        }
      }

      // If we didn't schedule it at all, OR if it still has remaining effort, carry it over!
      if (!scheduledThisTask || task.estimatedEffortHours > 0) {
        stillUnscheduled.push(task);
      }
    }
    
    unscheduledTasks = stillUnscheduled; // Carry over uncompleted tasks to next day

    // Icons
    blocks.forEach((b) => {
      if (b.type === "academic") b.icon = React.createElement(BookOpen, { className: "w-3 h-3" });
      else if (b.type === "personal") b.icon = React.createElement(Dumbbell, { className: "w-3 h-3" });
      else if (b.type === "ai-suggested") b.icon = React.createElement(Sparkles, { className: "w-3 h-3" });
      else if (b.type === "calendar") b.icon = React.createElement(CalendarDays, { className: "w-3 h-3" });
    });

    scheduleMap[dateStr] = blocks.sort((a, b) => a.startMins - b.startMins);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return scheduleMap;
}
