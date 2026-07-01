<div align="center">
  <img src="public/globe.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Campus Life OS</h1>
  <p align="center">
    <strong>Your Academic Life on Autopilot</strong>
    <br />
    <br />
    <a href="#-important-how-to-sign-in">How to Sign In</a>
    ·
    <a href="#problem-statement">Problem Statement</a>
    ·
    <a href="#features">Features</a>
    ·
    <a href="#tech-stack">Tech Stack</a>
  </p>
</div>

<hr />

## ⚠️ IMPORTANT: How to Sign In (Google Verification Warning)

Because Campus Life OS requires read-access to your Gmail to extract tasks and write-access to your Calendar to schedule them, it uses **Restricted Google Scopes**. 

When you click **Sign in with Google**, you might see a screen that says:
> **"Google hasn't verified this app"**

To continue testing the app, please follow these steps:
1. Click **Advanced** at the bottom left of the warning screen.
2. Click **Go to Campus Life OS (unsafe)**.
3. Check the boxes to allow the app to read your Gmail and Calendar.
4. Click **Continue**.

*Note: You must use an official `.ac.in` university email address to create an account.*

<hr />

## 🚨 Problem Statement

Modern university students are overwhelmed by information fragmentation. Between academic emails, personal emails, university portals, assignment deadlines, club announcements, and personal chores, critical tasks are constantly falling through the cracks. 

Students waste hours manually transferring deadlines from syllabi and emails into to-do lists, leading to **cognitive overload** and **high burnout risk**. 

**Campus Life OS** solves this by securely connecting to both your academic and personal inboxes, using AI to passively scan for tasks, deadlines, and announcements, and centralizing them into a single, beautiful, and predictive dashboard.

## 🚀 Features

- **AI Task Extraction Engine:** Integration with Gemini AI to scan emails, classify them as actionable tasks (Assignments, Quizzes, Meetings) or informational updates (Notices), and estimate completion effort.
- **Full-Stack Next.js Application:** A responsive, glassmorphism-inspired UI with a locked sidebar and independently scrollable modules.
- **14-Day Workload Forecasting:** Interactive charts that predict exactly when you'll be swamped by mapping your deadlines and estimated effort hours over the next two weeks.
- **Personal Routine Syncing:** Sync your gym schedules, society meetings, and personal habits right alongside your academic deadlines. 
- **Google Calendar Bi-directional Sync:** The dashboard reads your existing personal events, and allows you to push AI-extracted tasks directly into your Google Calendar as scheduled study blocks.
- **True Multi-Account OAuth & Token Vault:** Users can sign in with their primary academic email and securely link multiple personal Google accounts.
- **Intelligent Dashboard Layout:** 
  - Dynamic Task To-Do list with priority sorting.
  - "Notices & Updates" feed that intelligently categorizes announcements.
  - Interactive Workload visualization.
- **Account Deletion:** Full GDPR-compliant data wipe button that deletes all user tasks, activities, and revokes Google tokens instantly.

## 💻 Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons, Recharts (for workload charts).
- **Backend:** Next.js Serverless Route Handlers, Google Cloud (Gmail API, Calendar API, Google Identity Services).
- **Database / Auth:** Supabase (PostgreSQL), NextAuth.js.
- **AI / Machine Learning:** Google Gemini AI (Natural language processing and JSON task extraction).

## 📂 Repository Structure

```text
Campus-Life-OS/
├── src/
│   ├── app/                 # Next.js App Router (Frontend Pages)
│   │   ├── api/             # Serverless Backend Endpoints
│   │   ├── dashboard/       # Dashboard UI & Settings
│   │   └── globals.css      # Core Design Tokens
│   ├── components/          # Reusable React UI Components (Charts, Modals)
│   └── lib/                 # Core Business Logic
│       ├── gemini.ts        # AI Extraction Prompts
│       ├── gmail.ts         # Google APIs
│       └── scheduler.ts     # Workload & Forecasting Engine
├── .env.local               # Environment Variables (Ignored in Git)
└── package.json             # Dependencies
```

## 🛠 Setup Instructions

To run this project locally:

### 1. Clone & Install
```bash
git clone https://github.com/kaushalnandaniya/Campus-Life-OS.git
cd Campus-Life-OS
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 3. Run
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).
