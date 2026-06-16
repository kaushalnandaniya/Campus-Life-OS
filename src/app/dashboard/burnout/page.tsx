"use client";

import { calculateBurnoutScore } from "@/lib/demo-data";
import BurnoutMeter from "@/components/BurnoutMeter";
import {
  Activity,
  Brain,
  Heart,
  Moon,
  Flame,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default function BurnoutPage() {
  const burnout = calculateBurnoutScore();

  const tips =
    burnout.level === "high"
      ? [
          {
            icon: TrendingDown,
            title: "Reduce Workload",
            desc: "Move the Technical Writing report to this weekend to free up 6 hours.",
          },
          {
            icon: Moon,
            title: "Protect Sleep",
            desc: "You need at least 7 hours tonight. Stop studying by 11 PM.",
          },
          {
            icon: Heart,
            title: "Take a Break",
            desc: "Schedule a 30-minute walk between study sessions tomorrow.",
          },
        ]
      : burnout.level === "moderate"
      ? [
          {
            icon: Brain,
            title: "Focus Blocks",
            desc: "Use 2-hour deep work blocks for your most important tasks.",
          },
          {
            icon: Shield,
            title: "Say No",
            desc: "Skip one optional activity this week to create breathing room.",
          },
        ]
      : [
          {
            icon: Flame,
            title: "You're Doing Great",
            desc: "Your workload is well balanced. Keep up the good habits.",
          },
        ];

  const factors = [
    {
      label: "Task Density",
      value: burnout.factors.taskCount,
      unit: "tasks / 7 days",
      threshold: 5,
      icon: TrendingUp,
    },
    {
      label: "Total Effort",
      value: burnout.factors.totalEffort,
      unit: "hours of work",
      threshold: 20,
      icon: Activity,
    },
    {
      label: "Urgent Tasks",
      value: burnout.factors.urgentCount,
      unit: "high/critical",
      threshold: 3,
      icon: Flame,
    },
    {
      label: "Deadline Clustering",
      value: burnout.factors.maxDeadlinesPerDay,
      unit: "max per day",
      threshold: 3,
      icon: Brain,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Burnout Meter
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          AI analysis of your academic stress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Meter */}
        <div className="glass-card p-6 flex flex-col items-center justify-center animate-fade-in-up stagger-1">
          <BurnoutMeter
            score={burnout.score}
            level={burnout.level as "low" | "moderate" | "high"}
            size={200}
          />
          <p className="text-xs text-[var(--text-muted)] mt-5 text-center max-w-xs">
            {burnout.level === "high"
              ? "Your workload is unsustainable. Take action now."
              : burnout.level === "moderate"
              ? "Approaching stress zone. Consider optimizing."
              : "Workload is balanced. Keep it up."}
          </p>
        </div>

        {/* Factors */}
        <div className="space-y-3 animate-fade-in-up stagger-2">
          <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
            Risk Factors
          </h3>
          {factors.map((factor) => {
            const ratio = Math.min(factor.value / factor.threshold, 1);
            const isRisky = factor.value >= factor.threshold;
            const Icon = factor.icon;

            return (
              <div key={factor.label} className="glass-card !p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{
                        color: isRisky
                          ? "var(--color-danger)"
                          : "var(--color-success)",
                      }}
                    />
                    <span className="text-[13px] text-[var(--text-primary)]">
                      {factor.label}
                    </span>
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{
                      color: isRisky
                        ? "var(--color-danger)"
                        : "var(--text-secondary)",
                    }}
                  >
                    {factor.value} {factor.unit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: isRisky
                        ? "var(--color-danger)"
                        : ratio > 0.6
                        ? "var(--color-warning)"
                        : "var(--color-success)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="animate-fade-in-up stagger-3">
        <h3 className="text-xs font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wide">
          AI Recommendations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.title} className="glass-card p-4">
                <Icon className="w-4 h-4 text-[var(--accent)] mb-2" />
                <h4 className="text-[13px] font-medium text-[var(--text-primary)] mb-1">
                  {tip.title}
                </h4>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  {tip.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
