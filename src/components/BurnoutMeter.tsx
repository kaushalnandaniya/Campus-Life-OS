"use client";

import { useEffect, useState } from "react";

interface BurnoutMeterProps {
  score: number;
  level: "low" | "moderate" | "high";
  size?: number;
}

export default function BurnoutMeter({
  score,
  level,
  size = 160,
}: BurnoutMeterProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;

  const colorMap = {
    low: "var(--color-success)",
    moderate: "var(--color-warning)",
    high: "var(--color-danger)",
  };

  const labelMap = {
    low: "Healthy",
    moderate: "Watch Out",
    high: "High Risk",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="burnout-ring w-full h-full">
          <circle cx="50" cy="50" r={radius} className="track" />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="progress"
            style={{
              stroke: colorMap[level],
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold transition-colors duration-500"
            style={{ color: colorMap[level] }}
          >
            {animatedScore}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">/ 100</span>
        </div>
      </div>

      <div className="text-center">
        <p
          className="text-sm font-medium"
          style={{ color: colorMap[level] }}
        >
          {labelMap[level]}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
          Burnout Score
        </p>
      </div>
    </div>
  );
}
