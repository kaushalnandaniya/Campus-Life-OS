"use client";

import { Task } from "@/lib/demo-data";
import {
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  GraduationCap,
  Calendar,
} from "lucide-react";

const typeIcons: Record<string, React.ReactNode> = {
  assignment: <FileText className="w-3.5 h-3.5" />,
  quiz: <BookOpen className="w-3.5 h-3.5" />,
  exam: <GraduationCap className="w-3.5 h-3.5" />,
  meeting: <Users className="w-3.5 h-3.5" />,
  lecture: <GraduationCap className="w-3.5 h-3.5" />,
  event: <Calendar className="w-3.5 h-3.5" />,
};

interface TaskCardProps {
  task: Task;
  onToggleStatus?: (id: string) => void;
}

export default function TaskCard({ task, onToggleStatus }: TaskCardProps) {
  const deadline = task.deadline ? new Date(task.deadline) : null;
  const now = new Date();
  
  const hoursLeft = deadline ? Math.max(
    0,
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
  ) : 0;
  const daysLeft = Math.floor(hoursLeft / 24);

  const isOverdue = deadline ? hoursLeft <= 0 : false;
  const isUrgent = deadline ? hoursLeft < 24 && !isOverdue : false;

  const deadlineText = !deadline
    ? "No deadline"
    : isOverdue
    ? "Overdue"
    : daysLeft === 0
    ? `${Math.floor(hoursLeft)}h left`
    : daysLeft === 1
    ? "Tomorrow"
    : `${daysLeft}d left`;

  const deadlineColor = isOverdue
    ? "text-[var(--color-danger)]"
    : isUrgent
    ? "text-[var(--color-warning)]"
    : "text-[var(--text-muted)]";

  return (
    <div
      className={`task-card animate-fade-in ${
        task.status === "completed" ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <button
            onClick={() => onToggleStatus?.(task.id)}
            className={`mt-0.5 flex-shrink-0 transition-colors ${
              task.status === "completed"
                ? "text-[var(--color-success)]"
                : "text-[var(--text-muted)] hover:text-[var(--accent)]"
            }`}
          >
            {task.status === "completed" ? (
              <CheckCircle2 className="w-[18px] h-[18px]" />
            ) : (
              <div className="w-[18px] h-[18px] rounded-full border-[1.5px] border-current" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`badge badge-${task.priority}`}>
                {task.priority}
              </span>
              <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase">
                {task.source}
              </span>
            </div>

            <h4
              className={`text-[13px] font-medium text-[var(--text-primary)] leading-snug ${
                task.status === "completed" ? "line-through" : ""
              }`}
            >
              {task.title}
            </h4>

            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                {typeIcons[task.taskType]}
                {task.subjectCourse}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Clock className="w-3 h-3" />
                ~{task.estimatedEffortHours}h
              </span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
          <span
            className={`text-xs font-medium flex items-center gap-1 ${deadlineColor}`}
          >
            {(isOverdue || isUrgent) && (
              <AlertTriangle className="w-3 h-3" />
            )}
            {deadlineText}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {deadline ? deadline.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            }) : "Flexible"}
          </span>
        </div>
      </div>
    </div>
  );
}
