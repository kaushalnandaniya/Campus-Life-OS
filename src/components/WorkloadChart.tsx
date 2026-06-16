"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WorkloadDataPoint {
  day: string;
  date: string;
  academic: number;
  personal: number;
  total: number;
  taskCount: number;
}

interface WorkloadChartProps {
  data: WorkloadDataPoint[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] p-2.5 rounded-lg text-xs shadow-lg">
      <p className="font-medium text-[var(--text-primary)] mb-1.5">
        {data?.date} ({label})
      </p>
      <div className="space-y-0.5">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">Academic</span>
          <span className="font-medium">{data?.academic}h</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--text-muted)]">Personal</span>
          <span className="font-medium">{data?.personal}h</span>
        </div>
        <div className="flex justify-between gap-4 border-t border-[var(--border)] pt-1 mt-1">
          <span className="text-[var(--text-secondary)]">Total</span>
          <span className="font-bold">{data?.total}h</span>
        </div>
      </div>
    </div>
  );
}

export default function WorkloadChart({ data }: WorkloadChartProps) {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 5, right: 5, left: -15, bottom: 0 }}
        >
          <defs>
            <linearGradient id="academicGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c6ef0" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#7c6ef0" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="personalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.04)"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={{ stroke: "rgba(255, 255, 255, 0.06)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#6b7280" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="academic"
            name="Academic"
            stroke="#7c6ef0"
            strokeWidth={1.5}
            fill="url(#academicGrad)"
            animationDuration={800}
          />
          <Area
            type="monotone"
            dataKey="personal"
            name="Personal"
            stroke="#60a5fa"
            strokeWidth={1.5}
            fill="url(#personalGrad)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
