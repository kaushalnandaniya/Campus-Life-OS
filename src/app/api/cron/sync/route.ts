import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchGmailEmails } from "@/lib/gmail";
import { extractTasksFromEmails } from "@/lib/gemini";

// Required to allow Vercel Cron to ping this endpoint
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Basic security for manual triggers vs cron triggers
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // 1. Fetch all connected accounts
    const { data: accounts, error: accountsError } = await supabase
      .from("connected_accounts")
      .select("*");

    if (accountsError || !accounts) {
      throw new Error(`Failed to fetch connected accounts: ${accountsError?.message}`);
    }

    if (accounts.length === 0) {
      return NextResponse.json({ message: "No connected accounts found." });
    }

    console.log(`[Cron Sync] Starting autonomous background sync for ${accounts.length} accounts...`);

    let totalTasksExtracted = 0;

    // 2. Loop through each account
    for (const account of accounts) {
      let accessToken = account.access_token;
      
      // Check if token is expired (or expires in the next 5 mins)
      if (account.expires_at < Date.now() + 300000) {
        if (!account.refresh_token) {
          console.log(`[Cron Sync] Skipping ${account.account_email} due to missing refresh token.`);
          continue;
        }

        console.log(`[Cron Sync] Refreshing token for ${account.account_email}...`);
        
        try {
          const tokenUrl = "https://oauth2.googleapis.com/token";
          const res = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID || "",
              client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
              grant_type: "refresh_token",
              refresh_token: account.refresh_token,
            }),
          });

          const refreshedTokens = await res.json();
          if (res.ok && refreshedTokens.access_token) {
            accessToken = refreshedTokens.access_token;
            const newExpiresAt = Date.now() + refreshedTokens.expires_in * 1000;
            const newRefreshToken = refreshedTokens.refresh_token || account.refresh_token;

            await supabase
              .from("connected_accounts")
              .update({
                access_token: accessToken,
                refresh_token: newRefreshToken,
                expires_at: newExpiresAt,
              })
              .eq("id", account.id);
          } else {
             console.error(`[Cron Sync] Failed to refresh token for ${account.account_email}:`, refreshedTokens);
             continue; // Skip fetching emails for this account
          }
        } catch (err) {
           console.error(`[Cron Sync] Error during refresh for ${account.account_email}:`, err);
           continue;
        }
      }

      // 3. Fetch Emails
      let rawEmails = [];
      try {
        const lastSyncTimestamp = account.last_sync_timestamp ? parseInt(account.last_sync_timestamp, 10) : null;
        rawEmails = await fetchGmailEmails(accessToken, 15, lastSyncTimestamp);
      } catch (err) {
        console.error(`[Cron Sync] Failed to fetch emails for ${account.account_email}:`, err);
        continue;
      }

      if (rawEmails.length === 0) {
        console.log(`[Cron Sync] No new emails for ${account.account_email}.`);
        
        // Still update the timestamp
        await supabase
          .from("connected_accounts")
          .update({ last_sync_timestamp: Math.floor(Date.now() / 1000) })
          .eq("id", account.id);
          
        continue;
      }

      // 4. Extract Tasks
      console.log(`[Cron Sync] Extracting tasks from ${rawEmails.length} emails for ${account.account_email}...`);
      
      const mappedEmails = rawEmails.map((e) => ({
        id: e.id,
        subject: e.subject,
        from: e.from,
        body: e.body,
        _sourceAccount: account.account_email,
      }));

      const CHUNK_SIZE = 10;
      const extractedTasks = [];
      
      for (let i = 0; i < mappedEmails.length; i += CHUNK_SIZE) {
        const chunk = mappedEmails.slice(i, i + CHUNK_SIZE);
        const chunkTasks = await extractTasksFromEmails(chunk);
        extractedTasks.push(...chunkTasks);
      }

      console.log(`[Cron Sync] Extracted ${extractedTasks.length} tasks for ${account.account_email}.`);

      // 5. Save to Supabase and Push to Google Calendar
      if (extractedTasks.length > 0) {
        const { pushTaskToCalendar } = await import("@/lib/gcal");
        
        const dbTasks = [];
        for (const t of extractedTasks) {
           let gcal_event_id = null;
           if (t.deadline && t.deadline !== "null") {
             gcal_event_id = await pushTaskToCalendar(accessToken, t);
           }
           
           dbTasks.push({
             user_email: account.user_email, // Link task to the primary user dashboard
             title: t.title,
             description: t.description,
             subject_course: t.subjectCourse,
             task_type: t.taskType,
             deadline: t.deadline && t.deadline !== "null" ? new Date(t.deadline).toISOString() : null,
             estimated_effort_hours: t.estimatedEffortHours,
             priority: t.priority,
             status: t.status,
             source: t.source,
             ai_confidence: t.aiConfidence,
             gcal_event_id: gcal_event_id
           });
        }

        const { error: dbError } = await supabase.from("tasks").insert(dbTasks);
        if (dbError) {
          console.error(`[Cron Sync] Supabase Insert Error for ${account.account_email}:`, dbError);
        } else {
          totalTasksExtracted += dbTasks.length;
        }
      }

      // 6. Update last sync timestamp
      await supabase
        .from("connected_accounts")
        .update({ last_sync_timestamp: Math.floor(Date.now() / 1000) })
        .eq("id", account.id);
    }

    return NextResponse.json({
      message: "Cron sync complete",
      accountsProcessed: accounts.length,
      tasksExtracted: totalTasksExtracted
    });

  } catch (error: any) {
    console.error("[Cron Sync] Fatal Error:", error);
    return NextResponse.json(
      { error: "Internal server error during cron sync", details: error.message },
      { status: 500 }
    );
  }
}
