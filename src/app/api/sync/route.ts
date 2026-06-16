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
    const lastSyncTimestamp: number | null = body.lastSyncTimestamp || null;

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { error: "No accounts provided. Please sign in with Google." },
        { status: 401 }
      );
    }

    console.log(`[Sync] Fetching emails from ${accounts.length} inboxes (since: ${lastSyncTimestamp ? new Date(lastSyncTimestamp * 1000).toLocaleString() : 'last 7 days'})...`);
    
    // Step 1: Fetch emails from ALL inboxes in parallel
    const emailPromises = accounts.map(async (acc) => {
      try {
        const emails = await fetchGmailEmails(acc.accessToken, 15, lastSyncTimestamp);
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
      return NextResponse.json({
        tasks: [],
        emailsScanned: 0,
        emailsFiltered: 0,
        message: lastSyncTimestamp ? "Up to date! No new emails since last sync." : "No emails found in the last 7 days.",
      });
    }

    // Step 2: Since we explicitly authorized these inboxes, we trust ALL emails returned from them.
    // However, to keep it clean, we still filter out absolute junk if it's from the primary academic email.
    // Actually, since the user wants *everything* from these inboxes parsed, we just pass them all!
    const emailsToProcess = rawEmails;

    // Step 3: Extract tasks using AI
    console.log("[Sync] Extracting tasks with AI...");
    const extractedTasks = await extractTasksFromEmails(
      emailsToProcess.map((e) => ({
        id: e.id,
        subject: e.subject,
        from: e.from,
        body: e.body,
        _sourceAccount: e._sourceAccount,
      }))
    );
    console.log(`[Sync] Extracted ${extractedTasks.length} tasks`);

    const userEmail = accounts[0]?.email;
    if (extractedTasks.length > 0 && userEmail) {
      // Step 4: Save to Supabase
      const { supabase } = await import("@/lib/supabase");
      
      const dbTasks = extractedTasks.map((t) => ({
        user_email: userEmail,
        title: t.title,
        description: t.description,
        subject_course: t.subjectCourse,
        task_type: t.taskType,
        deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
        estimated_effort_hours: t.estimatedEffortHours,
        priority: t.priority,
        status: t.status,
        source: t.source,
        ai_confidence: t.aiConfidence,
      }));

      const { error: dbError } = await supabase.from("tasks").insert(dbTasks);
      if (dbError) {
        console.error("[Sync] Supabase Insert Error:", dbError);
      } else {
        console.log(`[Sync] Successfully saved ${dbTasks.length} tasks to Supabase`);
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
