// Demo data for Campus Life OS
// This simulates what the AI would extract from emails

export interface Task {
  id: string;
  title: string;
  description: string;
  subjectCourse: string;
  taskType: "assignment" | "quiz" | "exam" | "meeting" | "lecture" | "event" | "announcement" | "chore" | "personal" | "notice";
  deadline: string | null; // ISO string
  estimatedEffortHours: number;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "overdue";
  source: string;
  aiConfidence: number;
  createdAt: string;
}

export interface PersonalActivity {
  id: string;
  title: string;
  emoji: string;
  daysOfWeek: number[]; // 0=Sun, 1=Mon, ...
  startTime: string; // "HH:mm"
  endTime: string;
  isFlexible: boolean;
}

export interface ConflictAlert {
  id: string;
  type: "overlap" | "overload" | "burnout";
  severity: "warning" | "critical";
  message: string;
  suggestion: string;
  relatedTaskIds: string[];
}

// ===== DEMO TASKS =====
const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export const demoTasks: Task[] = [
  {
    id: "t1",
    title: "Data Structures Assignment #4",
    description: "Implement AVL tree with insert, delete, and search operations. Submit on Moodle.",
    subjectCourse: "Data Structures",
    taskType: "assignment",
    deadline: addDays(today, 1),
    estimatedEffortHours: 5,
    priority: "critical",
    status: "pending",
    source: "moodle",
    aiConfidence: 0.95,
    createdAt: addDays(today, -2),
  },
  {
    id: "t2",
    title: "Physics Quiz – Chapter 7 & 8",
    description: "Online quiz on electromagnetic induction. 30 minutes, open book.",
    subjectCourse: "Physics",
    taskType: "quiz",
    deadline: addDays(today, 2),
    estimatedEffortHours: 2,
    priority: "high",
    status: "pending",
    source: "classroom",
    aiConfidence: 0.92,
    createdAt: addDays(today, -1),
  },
  {
    id: "t3",
    title: "Math Problem Set #6",
    description: "Differential equations and Laplace transforms. 15 problems.",
    subjectCourse: "Mathematics III",
    taskType: "assignment",
    deadline: addDays(today, 3),
    estimatedEffortHours: 4,
    priority: "high",
    status: "in_progress",
    source: "gmail",
    aiConfidence: 0.88,
    createdAt: addDays(today, -3),
  },
  {
    id: "t4",
    title: "DBMS Project Review",
    description: "Present ER diagrams and normalization for the library management system project.",
    subjectCourse: "DBMS",
    taskType: "meeting",
    deadline: addDays(today, 4),
    estimatedEffortHours: 3,
    priority: "medium",
    status: "pending",
    source: "gmail",
    aiConfidence: 0.91,
    createdAt: addDays(today, -1),
  },
  {
    id: "t5",
    title: "Technical Writing Report",
    description: "Submit 2000-word report on AI in education. APA format required.",
    subjectCourse: "Technical Writing",
    taskType: "assignment",
    deadline: addDays(today, 5),
    estimatedEffortHours: 6,
    priority: "medium",
    status: "pending",
    source: "moodle",
    aiConfidence: 0.87,
    createdAt: addDays(today, -4),
  },
  {
    id: "t6",
    title: "Operating Systems Lab Exam",
    description: "Practical exam covering process scheduling, memory management, and file systems.",
    subjectCourse: "Operating Systems",
    taskType: "exam",
    deadline: addDays(today, 6),
    estimatedEffortHours: 8,
    priority: "critical",
    status: "pending",
    source: "classroom",
    aiConfidence: 0.96,
    createdAt: addDays(today, -5),
  },
  {
    id: "t7",
    title: "Robotics Club Meeting",
    description: "Discussion on the upcoming inter-college robotics competition. Team allocation.",
    subjectCourse: "Extracurricular",
    taskType: "event",
    deadline: addDays(today, 2),
    estimatedEffortHours: 1.5,
    priority: "low",
    status: "pending",
    source: "gmail",
    aiConfidence: 0.82,
    createdAt: addDays(today, -1),
  },
  {
    id: "t8",
    title: "Web Dev Mini Project Submission",
    description: "Deploy portfolio website on Vercel. Submit live link and GitHub repo.",
    subjectCourse: "Web Development",
    taskType: "assignment",
    deadline: addDays(today, 7),
    estimatedEffortHours: 4,
    priority: "medium",
    status: "pending",
    source: "moodle",
    aiConfidence: 0.93,
    createdAt: addDays(today, -6),
  },
  {
    id: "t9",
    title: "Guest Lecture – AI in Healthcare",
    description: "Mandatory attendance. Seminar hall, 2:00 PM. Attendance will be marked.",
    subjectCourse: "General",
    taskType: "lecture",
    deadline: addDays(today, 1),
    estimatedEffortHours: 2,
    priority: "high",
    status: "pending",
    source: "gmail",
    aiConfidence: 0.89,
    createdAt: addDays(today, 0),
  },
  {
    id: "t10",
    title: "CN Assignment – Subnetting",
    description: "Solve 10 subnetting problems. Show all workings. Handwritten submission.",
    subjectCourse: "Computer Networks",
    taskType: "assignment",
    deadline: addDays(today, 3),
    estimatedEffortHours: 3,
    priority: "medium",
    status: "pending",
    source: "classroom",
    aiConfidence: 0.90,
    createdAt: addDays(today, -2),
  },
];

// ===== PERSONAL ACTIVITIES =====
export const demoActivities: PersonalActivity[] = [
  {
    id: "a1",
    title: "Gym",
    emoji: "🏋️",
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    startTime: "06:00",
    endTime: "07:30",
    isFlexible: true,
  },
  {
    id: "a2",
    title: "Basketball",
    emoji: "🏀",
    daysOfWeek: [2, 4], // Tue, Thu
    startTime: "17:00",
    endTime: "18:30",
    isFlexible: true,
  },
  {
    id: "a3",
    title: "Sleep",
    emoji: "😴",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "23:00",
    endTime: "06:00",
    isFlexible: false,
  },
  {
    id: "a4",
    title: "Coding Practice",
    emoji: "💻",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "21:00",
    endTime: "22:30",
    isFlexible: true,
  },
];

// ===== CONFLICT ALERTS =====
export const demoConflicts: ConflictAlert[] = [
  {
    id: "c1",
    type: "overload",
    severity: "critical",
    message: "You have 3 deadlines within 48 hours: DS Assignment, Physics Quiz, and Guest Lecture.",
    suggestion: "Start the DS Assignment tonight. It needs 5 hours and your deadline is tomorrow.",
    relatedTaskIds: ["t1", "t2", "t9"],
  },
  {
    id: "c2",
    type: "overlap",
    severity: "warning",
    message: "Your Basketball session on Tuesday conflicts with the Robotics Club Meeting.",
    suggestion: "The Robotics meeting is non-academic. Consider skipping basketball this week or attending the meeting virtually.",
    relatedTaskIds: ["t7"],
  },
  {
    id: "c3",
    type: "burnout",
    severity: "critical",
    message: "Next week has 38 hours of scheduled work against 25 available hours. Burnout risk is HIGH.",
    suggestion: "Move the Technical Writing report to this weekend. That frees up 6 hours next week.",
    relatedTaskIds: ["t5", "t6"],
  },
];

import { BaselineEvent, CalendarEvent, defaultBaselineRoutine, generateSmartScheduleRange } from "./scheduler";

// ===== WORKLOAD DATA =====
export function getWorkloadData(
  tasks: Task[] = demoTasks, 
  calendarEvents: CalendarEvent[] = [], 
  baselineRoutine: BaselineEvent[] = defaultBaselineRoutine
) {
  const data = [];
  const start = new Date(today);
  const end = new Date(today);
  end.setDate(end.getDate() + 13); // +13 to make it 14 days total including today

  // Generate the AI schedule
  const scheduleMap = generateSmartScheduleRange(start, end, baselineRoutine, calendarEvents, tasks);

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const fullDateStr = date.toDateString();

    const blocks = scheduleMap[fullDateStr] || [];

    // Academic effort comes from "academic" routine blocks + "ai-suggested" study blocks
    const academicHours = blocks
      .filter(b => b.type === "academic" || b.type === "ai-suggested")
      .reduce((sum, b) => {
        let dur = b.endMins - b.startMins;
        if (dur < 0) dur += 1440; // Handle midnight crossover
        return sum + dur / 60;
      }, 0);

    // Personal effort comes from "personal" routine blocks + "calendar" events
    const personalHours = blocks
      .filter(b => b.type === "personal" || b.type === "calendar")
      .reduce((sum, b) => {
        let dur = b.endMins - b.startMins;
        if (dur < 0) dur += 1440; // Handle midnight crossover
        return sum + dur / 60;
      }, 0);

    const taskCount = blocks.filter(b => b.type === "ai-suggested").length;

    data.push({
      day: dayName,
      date: dateStr,
      academic: academicHours,
      personal: Math.min(personalHours, 4), // cap for chart readability
      total: academicHours + Math.min(personalHours, 4),
      taskCount: taskCount,
    });
  }
  return data;
}

// ===== BURNOUT SCORE CALCULATION =====
export function calculateBurnoutScore(tasks: Task[] = demoTasks) {
  const next7DaysTasks = tasks.filter((t) => {
    if (!t.deadline) return false;
    const d = new Date(t.deadline);
    const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 7;
  });

  let score = 0;

  // Factor 1: Task count
  if (next7DaysTasks.length > 5) score += 25;
  else if (next7DaysTasks.length > 3) score += 15;

  // Factor 2: Total effort
  const totalEffort = next7DaysTasks.reduce((s, t) => s + (t.estimatedEffortHours || 0), 0);
  if (totalEffort > 20) score += 25;
  else if (totalEffort > 12) score += 15;

  // Factor 3: Critical/high priority density
  const urgentCount = next7DaysTasks.filter(
    (t) => t.priority === "critical" || t.priority === "high"
  ).length;
  if (urgentCount >= 3) score += 20;
  else if (urgentCount >= 2) score += 10;

  // Factor 4: Deadline clustering
  const deadlineDays = new Set(
    next7DaysTasks.map((t) => new Date(t.deadline!).getDate())
  );
  const maxPerDay = Math.max(
    ...Array.from(deadlineDays).map(
      (day) =>
        next7DaysTasks.filter((t) => new Date(t.deadline!).getDate() === day).length
    ),
    0
  );
  if (maxPerDay >= 3) score += 20;
  else if (maxPerDay >= 2) score += 10;

  // Factor 5: No breaks
  score += 8; // Simulated — no free day detected

  return {
    score: Math.min(score, 100),
    level: score >= 60 ? "high" : score >= 35 ? "moderate" : "low",
    factors: {
      taskCount: next7DaysTasks.length,
      totalEffort,
      urgentCount,
      maxDeadlinesPerDay: maxPerDay,
    },
  };
}
