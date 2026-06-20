"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Plus, Check, Mail, User, ArrowRight } from "lucide-react";

interface PersonalEmailAccount {
  email: string;
  accessToken: string;
  expiresAt: number;
}

const PROFILE_KEY = "campus-life-os-profile";

export default function OnboardingModal({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState("");
  const [personalEmails, setPersonalEmails] = useState<PersonalEmailAccount[]>([]);

  useEffect(() => {
    // Pre-fill name from session
    if (session?.user?.name) {
      setDisplayName(session.user.name);
    }
    
    // Load any existing emails just in case
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.personalEmails) setPersonalEmails(data.personalEmails);
        if (data.displayName) setDisplayName(data.displayName);
      }
    } catch {}
  }, [session]);

  const handleComplete = () => {
    try {
      let profile: any = { personalEmails: [], preferences: {} };
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) {
        profile = JSON.parse(raw);
      }
      
      profile.displayName = displayName;
      profile.personalEmails = personalEmails;
      profile.hasCompletedOnboarding = true;
      
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error("Failed to save profile", e);
    }
    onComplete();
  };

  const addPersonalEmail = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Missing Google Client ID configuration.");
      return;
    }

    const redirectUri = `${window.location.origin}/oauth/callback`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&access_type=offline&scope=${scope}&prompt=consent`;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      "GoogleAuth",
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    const pollTimer = window.setInterval(() => {
      if (popup && popup.closed) {
        window.clearInterval(pollTimer);
        // Refresh emails from localStorage since popup updated it
        try {
          const raw = localStorage.getItem(PROFILE_KEY);
          if (raw) {
            const data = JSON.parse(raw);
            if (data.personalEmails) {
              setPersonalEmails(data.personalEmails);
            }
          }
        } catch {}
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-fade-in-up">
        <div className="p-6">
          <div className="w-12 h-12 bg-[var(--accent-dim)] rounded-xl flex items-center justify-center mb-5">
            <User className="w-6 h-6 text-[var(--accent)]" />
          </div>
          
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Welcome to Campus Life OS
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Let's get your profile set up so we can tailor your experience.
          </p>

          <div className="space-y-6">
            {/* Display Name */}
            <div>
              <label className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-2 block">
                What should we call you?
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                placeholder="Enter your preferred name"
              />
            </div>

            {/* Personal Emails */}
            <div>
              <label className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider mb-2 block">
                Connect Personal Accounts
              </label>
              <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
                Connect your personal Gmail to sync gym times, non-academic events, and personal tasks into your workload forecast.
              </p>

              <div className="space-y-2 mb-3">
                {personalEmails.map((emailObj) => (
                  <div key={emailObj.email} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[var(--text-secondary)]" />
                      <span className="text-sm text-[var(--text-primary)]">{emailObj.email}</span>
                    </div>
                    <Check className="w-4 h-4 text-[var(--color-success)]" />
                  </div>
                ))}
              </div>

              <button
                onClick={addPersonalEmail}
                className="w-full py-2.5 px-4 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Personal Email
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-surface)]">
          <button
            onClick={handleComplete}
            disabled={!displayName.trim()}
            className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Complete Setup
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
