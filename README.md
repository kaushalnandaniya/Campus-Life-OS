<div align="center">
  <img src="public/globe.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Campus Life OS</h1>
  <p align="center">
    <strong>An Intelligent, Unified Dashboard for the Overwhelmed Student</strong>
    <br />
    <br />
    <a href="#problem-statement">Problem Statement</a>
    ·
    <a href="#current-progress">Current Progress</a>
    ·
    <a href="#tech-stack">Tech Stack</a>
    ·
    <a href="#setup-instructions">Setup</a>
  </p>
</div>

<hr />

## 🚨 Problem Statement

Modern university students are overwhelmed by information fragmentation. Between academic emails, personal emails, university portals, assignment deadlines, club announcements, and personal chores, critical tasks are constantly falling through the cracks. 

Students waste hours manually transferring deadlines from syllabi and emails into to-do lists, leading to **cognitive overload** and **high burnout risk**. 

**Campus Life OS** solves this by securely connecting to both your academic and personal inboxes, using AI to passively scan for tasks, deadlines, and announcements, and centralizing them into a single, beautiful, and predictive dashboard.

## 🚀 Current Progress

We have successfully built the core functional prototype and deployed a robust, autonomous backend architecture. The current state of the project includes:

- **Full-Stack Next.js Application:** A responsive, glassmorphism-inspired UI with a unified dashboard.
- **True Multi-Account OAuth & Token Vault:** Users can sign in with their primary academic email and securely link multiple personal Google accounts. We built a custom **Supabase Token Vault** to securely store OAuth `refresh_tokens`, completely bypassing standard frontend limitations.
- **True Offline Background Sync:** A fully autonomous Vercel Cron engine (`/api/cron/sync`) runs in the background. Even when the user's laptop is completely shut down, it automatically intercepts expired Google tokens, uses the vault to silently swap them for fresh access tokens, and continuously pulls emails.
- **AI Task Extraction Engine:** Integration with Gemini (with Groq Llama 3 fallback) to scan emails, classify them as actionable tasks (Assignments, Quizzes, Meetings) or informational updates (Notices, Receipts), and estimate completion effort. Built-in batch chunking prevents LLM token limits from crashing the sync.
- **Intelligent Dashboard:** 
  - Dynamic Task To-Do list with priority sorting and active/completed filtering.
  - "Notices & Updates" feed that intelligently categorizes non-actionable emails and announcements.
  - **Burnout Predictor:** A visual workload gauge that calculates effort hours vs. deadlines to warn students of impending burnout.
- **Enhanced Data Tracking:** Tasks and notices display their exact origin inbox (e.g., `Gmail (student@college.edu)`).
- **Supabase Integration:** Live PostgreSQL database setup for persisting synced tasks and the multi-account Token Vault securely.

## 💻 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, Recharts (for data visualization).
- **Backend:** Next.js Serverless Route Handlers, Vercel Cron Jobs, Google Cloud (Gmail API & Google Identity Services).
- **Database / Auth:** Supabase (PostgreSQL), NextAuth.js.
- **AI / Machine Learning:** Google Gemini Flash API (with Groq fallback) for natural language processing and task extraction.

## 🔮 Planned Features (Post-Buildathon)

Moving forward to the final submission, we plan to implement:
1. **Google Calendar Bi-directional Sync:** Automatically push extracted deadlines directly to the user's Google Calendar, and pull existing calendar events into the dashboard.
2. **Smart Conflict Resolution:** AI-driven suggestions for rescheduling low-priority tasks when the Burnout Predictor detects high stress levels.

## 📂 Repository Structure

Because Campus Life OS is a modern Full-Stack Next.js application, the frontend and backend are unified within the `src/` directory for optimal server-side rendering and API route handling:

```text
Campus-Life-OS/
├── src/
│   ├── app/                 # Next.js App Router (Frontend Pages)
│   │   ├── api/             # Serverless Backend Endpoints (Backend)
│   │   ├── dashboard/       # Dashboard UI & Settings
│   │   └── globals.css      # Core Design Tokens
│   ├── components/          # Reusable React UI Components
│   └── lib/                 # Core Business Logic & AI Models
│       ├── gemini.ts        # AI Extraction Prompts & Validation (Models)
│       ├── gmail.ts         # Google API Integration
│       └── supabase.ts      # Database Client
├── public/                  # Static Assets (Images, Icons)
├── .env.local               # Environment Variables (Ignored in Git)
├── next.config.mjs          # Framework Configuration
└── package.json             # Dependencies
```

## 🛠 Setup Instructions

To run this project locally, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/kaushalnandaniya/Campus-Life-OS.git
cd Campus-Life-OS
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory and add the following keys:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

GEMINI_API_KEY=your_gemini_api_key

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```
*(Note: You must also add `http://localhost:3000` to your Authorized JavaScript origins and Authorized Redirect URIs in the Google Cloud Console).*

### 4. Run the Development Server
```bash
npm run dev
```

### 5. Access the App
Open [http://localhost:3000](http://localhost:3000) in your browser.
