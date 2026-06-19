import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { fetchCalendarEvents } from "@/lib/gcal";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const primaryEmail = session.user.email.toLowerCase();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch all connected accounts for this user
    const { data: accounts, error } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_email", primaryEmail);

    if (error || !accounts) {
      throw new Error("Failed to fetch accounts from Token Vault");
    }

    const allEvents = [];

    // Pull events from each connected Google Calendar
    for (const account of accounts) {
      let accessToken = account.access_token;
      
      // If token is expired, refresh it first
      if (account.expires_at < Date.now() + 60000) {
        if (!account.refresh_token) {
          console.warn(`[Calendar API] Skipping ${account.account_email} due to missing refresh token.`);
          continue;
        }

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

            // Save the new token back to the vault
            await supabase
              .from("connected_accounts")
              .update({
                access_token: accessToken,
                refresh_token: newRefreshToken,
                expires_at: newExpiresAt,
              })
              .eq("id", account.id);
          } else {
             console.error(`[Calendar API] Failed to refresh token for ${account.account_email}`);
             continue; 
          }
        } catch (err) {
           console.error(`[Calendar API] Error during refresh for ${account.account_email}:`, err);
           continue;
        }
      }

      const events = await fetchCalendarEvents(accessToken);
      
      // Map the events to a standard format and tag them with the source account
      const mappedEvents = events.map((e: any) => ({
        id: e.id,
        title: e.summary,
        description: e.description || "",
        startTime: e.start.dateTime || e.start.date, // Google Calendar returns date for all-day events
        endTime: e.end.dateTime || e.end.date,
        sourceAccount: account.account_email,
        link: e.htmlLink
      }));

      allEvents.push(...mappedEvents);
    }

    // Sort by start time
    allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    return NextResponse.json({ events: allEvents });
  } catch (error: any) {
    console.error("[Calendar API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
