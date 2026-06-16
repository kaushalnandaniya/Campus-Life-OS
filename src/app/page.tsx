"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  ArrowRight,
  Mail,
  Brain,
  CalendarCheck,
  Activity,
  ShieldCheck,
  Sparkles,
  LogIn,
} from "lucide-react";

const features = [
  {
    icon: Mail,
    title: "Zero-Click Sync",
    description:
      "Automatically reads your university emails. No manual entry ever.",
  },
  {
    icon: Brain,
    title: "AI Task Extraction",
    description:
      "Gemini AI parses every email to extract deadlines, subjects, and priorities.",
  },
  {
    icon: CalendarCheck,
    title: "Smart Scheduling",
    description:
      "Generates daily plans balancing academics with gym, sports, and sleep.",
  },
  {
    icon: Activity,
    title: "Burnout Prediction",
    description:
      "Monitors workload density and alerts you before you hit burnout.",
  },
  {
    icon: ShieldCheck,
    title: "Conflict Detection",
    description:
      "Spots overlapping deadlines and suggests smart resolutions.",
  },
  {
    icon: Sparkles,
    title: "Student Digital Twin",
    description:
      "Learns your habits and keeps you ahead of your academic workload.",
  },
];

export default function LandingPage() {
  const { data: session } = useSession();

  const handleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen relative">
      <div className="bg-glow" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-8 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            Campus Life OS
          </span>
        </div>
        {session ? (
          <Link href="/dashboard" className="btn-primary">
            Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <button onClick={handleSignIn} className="btn-primary">
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
        )}
      </header>

      {/* Hero */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 md:px-8">
        <section className="text-center pt-16 pb-12">
          <p className="text-xs font-medium text-[var(--accent)] mb-4 uppercase tracking-wider animate-fade-in-up">
            AI-Powered Student Intelligence
          </p>

          <h1 className="text-4xl md:text-6xl font-bold leading-[1.1] mb-5 animate-fade-in-up stagger-1">
            Never miss a{" "}
            <span className="gradient-text">deadline</span>
            <br />
            again.
          </h1>

          <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8 leading-relaxed animate-fade-in-up stagger-2">
            Campus Life OS reads your university emails, extracts every
            assignment using AI, and warns you before burnout.
          </p>

          <div className="flex items-center justify-center gap-3 animate-fade-in-up stagger-3">
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-2.5">
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={handleSignIn}
                className="btn-primary px-6 py-2.5"
              >
                <Mail className="w-4 h-4" />
                Sign in with Google
              </button>
            )}
            <Link href="/dashboard" className="btn-secondary px-6 py-2.5">
              View Demo
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 mt-12 animate-fade-in-up stagger-4">
            {[
              { value: "47", label: "Emails scanned" },
              { value: "8", label: "Tasks extracted" },
              { value: "0", label: "Missed deadlines" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-[var(--text-primary)]">
                  {stat.value}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-12">
          <h2 className="text-center text-xl font-semibold text-[var(--text-primary)] mb-8">
            Your academic life, automated
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`glass-card p-5 animate-fade-in-up stagger-${i + 1}`}
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--accent-dim)] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 text-center">
          <div className="glass-card p-10 max-w-2xl mx-auto">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Built for DAU Students
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md mx-auto">
              Connects to your @dau.ac.in email. Works with Moodle, Google
              Classroom, and university announcements.
            </p>
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-2.5">
                Open Dashboard
              </Link>
            ) : (
              <button
                onClick={handleSignIn}
                className="btn-primary px-6 py-2.5"
              >
                <Mail className="w-4 h-4" />
                Get Started Free
              </button>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 border-t border-[var(--border)] text-center">
          <p className="text-[11px] text-[var(--text-muted)]">
            Built for Buildathon 2026 — Campus Life OS
          </p>
        </footer>
      </main>
    </div>
  );
}
