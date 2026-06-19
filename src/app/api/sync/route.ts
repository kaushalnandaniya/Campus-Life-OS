// API Route: Sync emails and extract tasks
// POST /api/sync — Fetches emails, runs AI extraction, returns structured tasks

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { fetchGmailEmails, filterAcademicEmails } from "@/lib/gmail";
import { extractTasksFromEmails } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    // Get multi-account data from request body
    const body = await req.json();
    const accounts: { email: string; accessToken: string }[] = body.accounts || [];

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No accounts provided. Please sign in with Google." },
        { status: 401 }
      );
    }

    const userEmail = accounts[0]?.email;

    // Load individual sync timestamps from DB
    const { supabase } = await import("@/lib/supabase");
    const { data: dbAccounts } = await supabase
      .from("connected_accounts")
      .select("account_email, last_sync_timestamp")
      .eq("user_email", userEmail);

    console.log(`[Sync] Fetching emails from ${accounts.length} inboxes...`);
    
    // Step 1: Fetch emails from ALL inboxes in parallel
    const emailPromises = accounts.map(async (acc) => {
      const dbAcc = dbAccounts?.find(d => d.account_email === acc.email);
      const accLastSync = dbAcc?.last_sync_timestamp || null;

      try {
        const emails = await fetchGmailEmails(acc.accessToken, 15, accLastSync);
        return emails.map(e => ({ ...e, _sourceAccount: acc.email }));
      } catch (err) {
        console.error(`Failed to fetch emails for ${acc.email}:`, err);
        return [];
      }
    });

    const nestedEmails = await Promise.all(emailPromises);
    const allEmails = nestedEmails.flat();
    
    // Deduplicate by threadId/id just in case
    const uniqueEmailsMap = new Map();
    allEmails.forEach(e => {
       if (!uniqueEmailsMap.has(e.id)) uniqueEmailsMap.set(e.id, e);
    });
    const rawEmails = Array.from(uniqueEmailsMap.values());

    console.log(`[Sync] Fetched a total of ${rawEmails.length} unique emails across all accounts.`);

    if (rawEmails.length === 0) {
      // Update last sync timestamp even if 0 emails found
      if (userEmail) {
        for (const account of accounts) {
           await supabase
             .from("connected_accounts")
             .update({ last_sync_timestamp: Math.floor(Date.now() / 1000) })
             .eq("account_email", account.email)
             .eq("user_email", userEmail);
        }
      }

      return NextResponse.json({
        tasks: [],
        emailsScanned: 0,
        emailsFiltered: 0,
        message: "Up to date! No new academic emails found since last sync.",
      });
    }

    // Step 2: Since we explicitly authorized these inboxes, we trust ALL emails returned from them.
    // However, to keep it clean, we still filter out absolute junk if it's from the primary academic email.
    // Actually, since the user wants *everything* from these inboxes parsed, we just pass them all!
    const emailsToProcess = rawEmails;

    // Step 3: Extract tasks using AI
    console.log("[Sync] Extracting tasks with AI...");
    
    const mappedEmails = emailsToProcess.map((e) => ({
      id: e.id,
      subject: e.subject,
      from: e.from,
      body: e.body,
      date: e.date,
      _sourceAccount: e._sourceAccount,
    }));
    
    // Batch process in chunks of 10 to prevent MAX_TOKENS truncation on long responses
    const CHUNK_SIZE = 10;
    const extractedTasks = [];
    
    for (let i = 0; i < mappedEmails.length; i += CHUNK_SIZE) {
      const chunk = mappedEmails.slice(i, i + CHUNK_SIZE);
      console.log(`[Sync] Processing chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(mappedEmails.length / CHUNK_SIZE)} (${chunk.length} emails)`);
      const chunkTasks = await extractTasksFromEmails(chunk);
      extractedTasks.push(...chunkTasks);
    }
    
    console.log(`[Sync] Extracted a total of ${extractedTasks.length} tasks across all chunks`);

    if (extractedTasks.length > 0 && userEmail) {
      // Step 4: Save to Supabase and Push to Google Calendar
      const { pushTaskToCalendar } = await import("@/lib/gcal");
      
      const dbTasks = [];
      
      for (const t of extractedTasks as any[]) {
        // Find which account this task came from (via the original email source)
        const originalEmail = mappedEmails.find((e) => e.id === t.emailId);
        const sourceEmail = originalEmail?._sourceAccount || userEmail;
        
        // Find the access token for this source email
        const sourceAccount = accounts.find((a: any) => a.email === sourceEmail) || accounts[0];
        
        let taskDeadline = t.deadline;
        if (!taskDeadline || taskDeadline === "null") {
          if (originalEmail && originalEmail.date) {
            // Attempt to parse the email's Date header string
            try {
              taskDeadline = new Date(originalEmail.date).toISOString();
            } catch (e) {
              taskDeadline = null;
            }
          }
        }

        let gcal_event_ids: string[] = [];
        // Only push to Google Calendar if it has a deadline AND is not a notice/announcement
        if (taskDeadline && taskDeadline !== "null" && t.taskType !== "notice" && t.taskType !== "announcement") {
          // Push strictly to the calendar of the account that received the email, NOT all accounts
          const id = await pushTaskToCalendar(sourceAccount.accessToken, { ...t, deadline: taskDeadline });
          if (id) gcal_event_ids.push(id);
        }

        dbTasks.push({
          user_email: userEmail,
          title: t.title,
          description: t.description,
          subject_course: t.subjectCourse,
          task_type: t.taskType,
          deadline: taskDeadline && taskDeadline !== "null" ? new Date(taskDeadline).toISOString() : null,
          estimated_effort_hours: t.estimatedEffortHours,
          priority: t.priority,
          status: t.status,
          source: t.source,
          ai_confidence: t.aiConfidence,
          gcal_event_id: gcal_event_ids.length > 0 ? gcal_event_ids.join(",") : null
        });
      }

      const { error: dbError } = await supabase.from("tasks").insert(dbTasks);
      if (dbError) {
        console.error("[Sync] Supabase Insert Error:", dbError);
      } else {
        console.log(`[Sync] Successfully saved ${dbTasks.length} tasks to Supabase`);
      }
    }

    // Always update last sync timestamp for all processed accounts
    if (userEmail) {
      for (const account of accounts) {
         await supabase
           .from("connected_accounts")
           .update({ last_sync_timestamp: Math.floor(Date.now() / 1000) })
           .eq("account_email", account.email)
           .eq("user_email", userEmail);
      }
    }

    return NextResponse.json({
      tasks: extractedTasks,
      emailsScanned: rawEmails.length,
      emailsFiltered: emailsToProcess.length,
      message: `Found ${extractedTasks.length} tasks from ${emailsToProcess.length} emails`,
    });
  } catch (error: any) {
    console.error("[Sync] Error:", error);

    // Detect Google OAuth token expiration (401)
    if (
      error.message?.includes("401") ||
      error.message?.includes("invalid authentication credentials")
    ) {
      return NextResponse.json(
        {
          error: "Your Google session has expired. Please sign in again to refresh it.",
          isExpired: true,
          tasks: [],
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || "Failed to sync emails",
        tasks: [],
      },
      { status: 500 }
    );
  }
}
