import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { fetchCalendarEvents } from "@/lib/gcal";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
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
      
      // We don't rotate here if expired, because the Sync endpoints already handle rotation
      // But just to be safe, if it is expired, we skip it for now.
      if (account.expires_at < Date.now() + 60000) {
         continue; // Wait for Sync process to rotate it
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
