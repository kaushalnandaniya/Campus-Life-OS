"use client";

import { ConflictAlert } from "@/lib/demo-data";
import { AlertTriangle, Lightbulb, X } from "lucide-react";
import { useState } from "react";

interface ConflictBannerProps {
  conflicts: ConflictAlert[];
}

export default function ConflictBanner({ conflicts }: ConflictBannerProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = conflicts.filter((c) => !dismissed.includes(c.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 animate-fade-in">
      {visible.map((conflict) => (
        <div
          key={conflict.id}
          className="relative p-3 rounded-lg border bg-[var(--bg-card)] border-[var(--border)]"
        >
          <button
            onClick={() => setDismissed([...dismissed, conflict.id])}
            className="absolute top-2.5 right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-2.5 pr-6">
            <AlertTriangle
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{
                color:
                  conflict.severity === "critical"
                    ? "var(--color-danger)"
                    : "var(--color-warning)",
              }}
            />

            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text-primary)] leading-relaxed">
                {conflict.message}
              </p>

              {conflict.suggestion && (
                <div className="flex items-start gap-1.5 mt-2 text-xs text-[var(--text-muted)]">
                  <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                  <span>{conflict.suggestion}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
