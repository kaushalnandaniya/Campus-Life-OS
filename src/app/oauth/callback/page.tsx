"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export default function OAuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Securing your connection...");

  useEffect(() => {
    // The code will be in the search parameters, not the hash
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setMessage(`Google Authorization Error: ${error}`);
      return;
    }

    if (!code) {
      setStatus("error");
      setMessage("Authorization code missing from Google response.");
      return;
    }

    // We have the code! Send it to our backend to exchange for tokens
    const redirectUri = `${window.location.origin}/oauth/callback`;
    
    fetch("/api/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setStatus("error");
          setMessage(data.error);
          return;
        }

        const emailStr = data.email.toLowerCase();
        
        // Save to localStorage
        try {
          const rawProfile = localStorage.getItem("campus-life-os-profile");
          const profile = rawProfile ? JSON.parse(rawProfile) : { displayName: "", phone: "", personalEmails: [] };
          
          // Remove existing entry if it exists to update it
          const existing = profile.personalEmails ? profile.personalEmails.filter((pe: any) => pe.email !== emailStr) : [];
          
          const newAccount = {
            email: emailStr,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken, // New: securely store the refresh token!
            expiresAt: Date.now() + (parseInt(data.expiresIn || "3600", 10) * 1000)
          };

          const updatedProfile = {
            ...profile,
            personalEmails: [...existing, newAccount]
          };

          localStorage.setItem("campus-life-os-profile", JSON.stringify(updatedProfile));
          
          setStatus("success");
          setMessage(`Successfully linked ${emailStr}! You can close this window.`);
          
          // Try to auto-close the popup
          setTimeout(() => {
            window.close();
          }, 2000);

        } catch (e) {
          setStatus("error");
          setMessage("Failed to save profile data.");
        }
      })
      .catch(err => {
        setStatus("error");
        setMessage("Failed to exchange authorization code. " + err.message);
      });

  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-4 animate-fade-in-up">
        <div className="flex justify-center mb-6">
          {status === "loading" && <Loader2 className="w-12 h-12 text-[var(--accent)] animate-spin" />}
          {status === "success" && <CheckCircle2 className="w-12 h-12 text-[var(--color-success)]" />}
          {status === "error" && <XCircle className="w-12 h-12 text-[var(--color-danger)]" />}
        </div>
        
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          {status === "loading" ? "Authorizing..." : status === "success" ? "Authorized!" : "Authorization Failed"}
        </h1>
        
        <p className="text-[13px] text-[var(--text-muted)]">
          {message}
        </p>

        {status === "success" && (
          <p className="text-[11px] text-[var(--text-muted)] mt-4">
            This window will close automatically. If it doesn't, you can safely close it and refresh your Settings page.
          </p>
        )}
      </div>
    </div>
  );
}
