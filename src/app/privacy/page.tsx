export const metadata = {
  title: "Privacy Policy - Campus Life OS",
  description: "Privacy Policy for Campus Life OS",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Last updated: June 23, 2026</p>

      <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">1. Overview</h2>
          <p>
            Campus Life OS (&quot;we&quot;, &quot;our&quot;, or &quot;the App&quot;) is an academic productivity tool built for university students. This policy explains how we collect, use, and protect your data.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">2. Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Google Account Information:</strong> Your name, email address, and profile picture via Google OAuth.</li>
            <li><strong>Gmail Data (Read-Only):</strong> We read your email subjects, senders, dates, and body text solely to extract academic tasks and deadlines using AI. We never send, delete, or modify your emails.</li>
            <li><strong>Google Calendar Data:</strong> We read your calendar events to display your schedule and write new events when you choose to push AI-extracted tasks to your calendar.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">3. How We Use Your Data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Extract academic deadlines, assignments, and announcements from your emails using AI (Google Gemini).</li>
            <li>Display tasks, workload forecasts, and schedule information on your personal dashboard.</li>
            <li>Push study blocks and deadlines to your Google Calendar (only when you explicitly request it).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">4. Data Storage & Security</h2>
          <p>
            Your extracted tasks and account metadata are stored securely in a Supabase (PostgreSQL) database. Google OAuth refresh tokens are stored in an encrypted token vault. All communication is over HTTPS.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">5. Data Sharing</h2>
          <p>
            We do <strong>not</strong> sell, rent, or share your personal data with any third parties. Email content is sent to Google Gemini AI solely for task extraction and is not stored by the AI provider.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">6. Data Deletion</h2>
          <p>
            You can delete your account and all associated data at any time from the Settings page in the dashboard. This permanently removes all tasks, activities, tokens, and personal data from our database.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">7. Contact</h2>
          <p>
            For any questions about this privacy policy, please contact us at the university or via our GitHub repository.
          </p>
        </section>
      </div>
    </div>
  );
}
