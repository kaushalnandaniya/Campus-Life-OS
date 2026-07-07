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
      "AI parses every email to extract deadlines, subjects, and priorities.",
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
    title: "14-Day Workload Forecast",
    description:
      "Interactive charts that predict exactly when you'll be swamped so you can plan ahead.",
  },
  {
    icon: Sparkles,
    title: "Personal Routine Balance",
    description:
      "Sync your gym schedules, society meetings, and personal habits right alongside your academic deadlines.",
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
            Your Academic Life <br/> on{" "}
            <span className="gradient-text">Autopilot</span>.
          </h1>

          <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8 leading-relaxed animate-fade-in-up stagger-2">
            Campus Life OS reads your university emails, predicts your workload, and balances your academics with your personal life using AI.
          </p>

          <div className="flex flex-col items-center justify-center animate-fade-in-up stagger-3">
            <div className="flex items-center justify-center gap-3">
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
            </div>
            {!session && (
              <p className="text-[11px] text-[var(--text-muted)] mt-4 max-w-xs text-center leading-relaxed">
                <span className="text-[var(--color-warning)] font-medium">Important:</span> Please sign in using your official <strong className="text-[var(--text-primary)]">.ac.in</strong> email address to create an account.
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 mt-12 animate-fade-in-up stagger-4">
            {[
              { value: "500+", label: "Manual hours saved" },
              { value: "100%", label: "Deadlines met" },
              { value: "14", label: "Days forecasted" },
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
              Built for University Students
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-5 max-w-md mx-auto">
              Connects to your .ac.in email. Works with university announcements, Google
              Classroom, and academic communications.
            </p>
            {session ? (
              <Link href="/dashboard" className="btn-primary px-6 py-2.5">
                Open Dashboard
              </Link>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <button
                  onClick={handleSignIn}
                  className="btn-primary px-6 py-2.5"
                >
                  <Mail className="w-4 h-4" />
                  Get Started Free
                </button>
                <p className="text-[11px] text-[var(--text-muted)] mt-4 max-w-xs text-center leading-relaxed">
                  Requires an official <strong className="text-[var(--text-primary)]">.ac.in</strong> email address.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 border-t border-[var(--border)] text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-muted)]">
            <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">
              Privacy Policy
            </Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">
              Terms of Service
            </Link>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            Built for Buildathon 2026 — Campus Life OS
          </p>
        </footer>
      </main>
    </div>
  );
}
