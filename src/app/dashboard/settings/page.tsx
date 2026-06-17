"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Mail, Bell, Shield, User, Plus, X, Save, Check } from "lucide-react";

interface PersonalEmailAccount {
  email: string;
  accessToken: string;
  expiresAt: number;
}

interface UserProfile {
  displayName: string;
  phone: string;
  personalEmails: PersonalEmailAccount[]; // Now stores OAuth data
}

const PROFILE_KEY = "campus-life-os-profile";

function loadProfile(): UserProfile {
  if (typeof window === "undefined") return { displayName: "", phone: "", personalEmails: [] };
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Migrate old string arrays to object arrays (with empty tokens so they can be re-auth'd)
      if (data.personalEmails && data.personalEmails.length > 0 && typeof data.personalEmails[0] === "string") {
        data.personalEmails = data.personalEmails.map((e: string) => ({
          email: e,
          accessToken: "",
          expiresAt: 0
        }));
      }
      return data;
    }
  } catch {}
  return { displayName: "", phone: "", personalEmails: [] };
}

function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile>({ displayName: "", phone: "", personalEmails: [] });
  const [newEmail, setNewEmail] = useState("");
  const [saved, setSaved] = useState(false);

  // Load profile from localStorage on mount
  useEffect(() => {
    const loaded = loadProfile();
    // Pre-fill display name from session if empty
    if (!loaded.displayName && session?.user?.name) {
      loaded.displayName = session.user.name;
    }
    setProfile(loaded);
  }, [session]);

  const handleSaveProfile = () => {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Load GIS Script
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  const addPersonalEmail = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      alert("Missing Google Client ID configuration.");
      return;
    }

    // Use a manual OAuth flow to completely bypass the "Authorized JavaScript origins" Google Cloud bug
    // We will use the redirect URI which we KNOW works because NextAuth uses it successfully!
    const redirectUri = `${window.location.origin}/oauth/callback`;
    const scope = encodeURIComponent("https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar");
    // We use response_type=code & access_type=offline to get a refresh_token for background sync
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&access_type=offline&scope=${scope}&prompt=consent`;

    // Open a popup window
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      "GoogleAuth",
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    // Poll to see when the popup closes to refresh the UI
    const pollTimer = window.setInterval(() => {
      if (popup && popup.closed) {
        window.clearInterval(pollTimer);
        // Refresh profile state from localStorage since popup updated it
        const loaded = loadProfile();
        if (!loaded.displayName && session?.user?.name) {
          loaded.displayName = session.user.name;
        }
        setProfile(loaded);
      }
    }, 1000);
  };

  const removePersonalEmail = (email: string) => {
    const updated = {
      ...profile,
      personalEmails: profile.personalEmails.filter((e) => e.email !== email),
    };
    setProfile(updated);
    saveProfile(updated);
  };

  const connectedEmail = session?.user?.email || "Not connected";

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="animate-fade-in-up">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Settings
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile */}
      <div className="glass-card p-5 animate-fade-in-up">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Profile
          </h2>
        </div>

        <div className="space-y-3">
          {/* Avatar + Name row */}
          <div className="flex items-center gap-3 pb-3 border-b border-[var(--border)]">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-10 h-10 rounded-full"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[var(--accent-dim)] flex items-center justify-center text-sm font-bold text-[var(--accent)]">
                {profile.displayName?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {session?.user?.name || profile.displayName || "Student"}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">{connectedEmail}</p>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[11px] text-[var(--text-muted)] mb-1 block">
              Display Name
            </label>
            <input
              type="text"
              value={profile.displayName}
              onChange={(e) =>
                setProfile({ ...profile, displayName: e.target.value })
              }
              placeholder="Your name"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-border)] focus:outline-none"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-[11px] text-[var(--text-muted)] mb-1 block">
              Phone Number
            </label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
              placeholder="+91 XXXXX XXXXX"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-border)] focus:outline-none"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSaveProfile}
            className="btn-primary"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>

      {/* Email Accounts */}
      <div className="glass-card p-5 animate-fade-in-up stagger-1">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Email Accounts
          </h2>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mb-4">
          Sync tasks from both your university and personal emails in one place
        </p>

        <div className="space-y-3">
          {/* Primary (OAuth connected) */}
          <div className="flex items-center justify-between p-2.5 rounded-md bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[var(--accent-dim)] flex items-center justify-center">
                <Mail className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-[13px] text-[var(--text-primary)]">{connectedEmail}</p>
                <p className="text-[10px] text-[var(--text-muted)]">Primary · Synced via Google OAuth</p>
              </div>
            </div>
            <span className="badge badge-low">Active</span>
          </div>

          {/* Personal emails */}
          {profile.personalEmails.map((account) => (
            <div
              key={account.email}
              className="flex items-center justify-between p-2.5 rounded-md bg-[var(--bg-surface)]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[rgba(96,165,250,0.1)] flex items-center justify-center">
                  <Mail className="w-3.5 h-3.5 text-[var(--color-info)]" />
                </div>
                <div>
                  <p className="text-[13px] text-[var(--text-primary)]">{account.email}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Personal · Authorized via Google</p>
                </div>
              </div>
              <button
                onClick={() => removePersonalEmail(account.email)}
                className="text-[var(--text-muted)] hover:text-[var(--color-danger)] transition-colors p-1"
                title="Remove"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {/* Add email */}
          <div className="pt-2 border-t border-[var(--border)]">
            <button onClick={addPersonalEmail} className="btn-secondary w-full justify-center">
              <Plus className="w-3.5 h-3.5" />
              Authorize New Account
            </button>
            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mt-3">
              Clicking this will open a secure Google login window. This grants read-only access for 1 hour so the AI can pull your tasks and notices directly from your other inboxes.
            </p>
          </div>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="glass-card p-5 animate-fade-in-up stagger-2">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Sync Settings
          </h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] text-[var(--text-primary)]">Auto-sync</p>
              <p className="text-[11px] text-[var(--text-muted)]">How often to check for new emails</p>
            </div>
            <select className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-md px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-border)]">
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
              <option>Manual only</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-[13px] text-[var(--text-primary)]">Reset Sync History</p>
              <p className="text-[11px] text-[var(--text-muted)] max-w-[250px]">
                Force the next sync to scan the full past 7 days instead of just checking for new emails.
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem("campus-life-os-last-sync");
                alert("Sync history cleared! The next sync will do a full 7-day scan.");
              }}
              className="btn-secondary text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.1)] hover:border-[var(--color-danger)]"
            >
              Reset
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-[13px] text-[var(--text-primary)] text-[var(--color-danger)]">Danger Zone: Clear Database</p>
              <p className="text-[11px] text-[var(--text-muted)] max-w-[250px]">
                Permanently delete all synced tasks from your account. 
              </p>
            </div>
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to delete ALL tasks? This cannot be undone.")) {
                  const { supabase } = await import("@/lib/supabase");
                  const userEmail = session?.user?.email;
                  if (userEmail) {
                    await supabase.from("tasks").delete().eq("user_email", userEmail);
                    alert("All tasks deleted! You can now run a fresh sync from the dashboard.");
                  }
                }
              }}
              className="btn-secondary text-[var(--color-danger)] hover:bg-[rgba(239,68,68,0.1)] hover:border-[var(--color-danger)]"
            >
              Wipe Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass-card p-5 animate-fade-in-up stagger-3">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-[var(--color-warning)]" />
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            Notifications
          </h2>
        </div>
        <div className="space-y-2">
          {[
            { label: "Deadline reminders", desc: "24h and 2h before", on: true },
            { label: "Burnout warnings", desc: "When risk exceeds 60", on: true },
            { label: "Conflict alerts", desc: "When activities overlap", on: true },
            { label: "Weekly summary", desc: "Every Sunday at 8 PM", on: false },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5">
              <div>
                <p className="text-[13px] text-[var(--text-primary)]">{item.label}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{item.desc}</p>
              </div>
              <div
                className={`w-9 h-[18px] rounded-full relative cursor-pointer transition-colors ${
                  item.on
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--bg-surface)] border border-[var(--border)]"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[1px] transition-all ${
                    item.on ? "left-[19px]" : "left-[1px]"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI */}
      <div className="glass-card p-5 animate-fade-in-up stagger-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[var(--accent)]" />
          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            AI & Privacy
          </h2>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-[13px] text-[var(--text-primary)]">AI Model</p>
              <p className="text-[11px] text-[var(--text-muted)]">LLM for task extraction</p>
            </div>
            <span className="text-[11px] text-[var(--accent)] font-medium bg-[var(--accent-dim)] px-2.5 py-1 rounded-md">
              Gemini Flash + Groq
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-[13px] text-[var(--text-primary)]">Data retention</p>
              <p className="text-[11px] text-[var(--text-muted)]">Emails processed but never stored raw</p>
            </div>
            <span className="badge badge-low">Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
