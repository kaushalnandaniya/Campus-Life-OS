# From Chaos to Clarity: The Story of Campus Life OS

### The Spark: Drowning in Tabs
It was Friday night at the buildathon. Like most students at Dhirubhai Ambani University (DAU), we knew exactly what the biggest problem in our academic lives was: **Information Fragmentation**. 

Between checking our official `@dau.ac.in` university emails for syllabus updates, scouring Moodle for assignment deadlines, balancing our personal Gmail for society meetings, and trying to find time for the gym—critical tasks were constantly falling through the cracks. We weren't just disorganized; we were overwhelmed. The cognitive load of manually transferring deadlines from five different sources into a static to-do list was a surefire recipe for burnout.

We realized that what students needed wasn't another to-do list app where they had to manually type things in. We needed a system that *did the typing for us*. We needed an autonomous operating system for campus life.

### The Build: Teaching AI to Read Our Mail
Our ambitious goal was to build a "Zero-Click Sync" engine. The idea was simple: log in, and the app reads your university emails and tells you what you need to do. 

The implementation was much harder. Emails are messy. A professor might write, *"Hey class, don't forget the mid-term paper is due next Thursday at midnight, but I'll give an extension until Friday for those at the hackathon."*

To solve this, we turned to Large Language Models. We built an AI Extraction Engine that ingests email bodies and outputs structured, deterministic JSON. We spent hours tuning our prompts so the AI could accurately identify the difference between a high-priority "Assignment", a passive "Meeting", and a general "Notice".

### The "Aha!" Moment: The Burnout Predictor
Halfway through the hackathon, we had a functioning dashboard pulling tasks. But it was just a list. It didn't solve the *anxiety* of being a student.

We realized that 10 assignments due in 2 weeks is manageable, but 3 assignments due tomorrow is a crisis. We needed to visualize workload density. 

That’s when we built the **14-Day Workload Forecast** and the **Burnout Predictor**. By having the AI estimate the "effort hours" required for each extracted task, we mapped them onto an interactive chart. Suddenly, we could see exactly which days were going to be "red zones" (high burnout risk) and which days were "green zones" (free time). 

To make it perfect, we added **Personal Routine Sync**. A student isn't just a machine doing assignments; they go to the gym, they run, they sleep. By integrating personal activities alongside academic deadlines, we built a true holistic view of a student's life.

### The Final Polish: True Automation
To make Campus Life OS truly autonomous, we couldn't rely on the user having the app open. We built a custom **Token Vault in Supabase** to securely store Google OAuth refresh tokens. We then hooked this up to **Vercel Cron Jobs**. 

Now, even if a student's laptop is closed, our backend wakes up every hour, silently refreshes their Google tokens, scans their latest university emails, extracts the new tasks using AI, and pushes them directly into their Google Calendar. When they wake up, their day is already planned.

---

### 🤖 Transparency & Tech Disclosure

In compliance with the hackathon submission guidelines, here is a full disclosure of the tools, APIs, and AI models utilized to build Campus Life OS:

*   **Primary AI Model:** We used the **Google Gemini 1.5 Flash API** as our core natural language processing engine. It is responsible for parsing raw email HTML/text, extracting deadlines, summarizing subjects, estimating effort hours, and returning strictly typed JSON.
*   **Fallback AI Model:** We implemented **Groq (Llama 3 8B)** as an ultra-fast, secondary fallback API to handle extraction in the event of Gemini rate limits or failures.
*   **Authentication & APIs:** We used **NextAuth.js** integrated with **Google Identity Services** and the **Gmail API (gmail.readonly)** to fetch user emails securely. We also utilized the **Google Calendar API** to push AI-generated study blocks back to the user.
*   **Backend & Database:** We built on **Next.js 14 App Router**, deployed on **Vercel** (utilizing Vercel Cron for background syncs), with **Supabase (PostgreSQL)** serving as our secure database and token vault.
*   **UI/UX:** The frontend was built using **React**, **Tailwind CSS**, **Lucide Icons**, and **Recharts** for the workload forecasting visualization.

### The Future
What started as a frustration with scattered syllabi has evolved into a fully autonomous digital twin for students. Campus Life OS doesn't just list your tasks; it anticipates your week, protects your personal time, and actively works to keep you out of the burnout zone. 

We can't wait to launch it to the rest of the campus.
