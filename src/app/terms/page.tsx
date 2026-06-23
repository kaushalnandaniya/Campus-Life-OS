export const metadata = {
  title: "Terms of Service - Campus Life OS",
  description: "Terms of Service for Campus Life OS",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Terms of Service</h1>
      <p className="text-sm text-[var(--text-muted)] mb-6">Last updated: June 23, 2026</p>

      <div className="space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">1. Acceptance of Terms</h2>
          <p>
            By signing in to Campus Life OS, you agree to these Terms of Service. If you do not agree, please do not use the application.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">2. Description of Service</h2>
          <p>
            Campus Life OS is a free, open-source academic productivity dashboard built for students of Dhirubhai Ambani University. It connects to your Google account to read emails and calendar data, extract academic tasks using AI, and display them in a unified dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">3. Eligibility</h2>
          <p>
            This service is designed for students with an official <strong>@dau.ac.in</strong> email address. By using this app, you confirm that you are a current student or authorized member of Dhirubhai Ambani University.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">4. User Responsibilities</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for the security of your Google account credentials.</li>
            <li>You agree not to misuse the service or attempt to access other users&apos; data.</li>
            <li>You understand that AI-extracted tasks may occasionally be inaccurate and should be verified.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">5. Data & Privacy</h2>
          <p>
            Your use of Campus Life OS is also governed by our <a href="/privacy" className="text-blue-400 underline">Privacy Policy</a>. We only access your data with your explicit consent via Google OAuth.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">6. Disclaimer</h2>
          <p>
            Campus Life OS is provided &quot;as is&quot; without warranties of any kind. We are not responsible for missed deadlines, incorrect task extraction, or any academic consequences arising from use of this tool. Always verify important deadlines independently.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">7. Account Deletion</h2>
          <p>
            You may delete your account and all associated data at any time through the Settings page. Upon deletion, all your tasks, activities, tokens, and personal information will be permanently removed from our systems.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">8. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the application after changes constitutes acceptance of the new terms.
          </p>
        </section>
      </div>
    </div>
  );
}
