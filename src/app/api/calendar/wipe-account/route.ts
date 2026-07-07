import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const primaryEmail = session.user.email.toLowerCase();
    const { accountEmail } = await req.json();

    if (!accountEmail) {
      return NextResponse.json({ error: "Missing account email" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the specific connected account
    const { data: account, error } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_email", primaryEmail)
      .eq("account_email", accountEmail)
      .single();

    if (error || !account) {
      return NextResponse.json({ success: true, message: "Account already removed or not found" });
    }

    let accessToken = account.access_token;

    // Refresh if needed
    if (account.expires_at < Date.now() + 60000 && account.refresh_token) {
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
      }
    }

    // Fetch all events
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);
    const timeMin = minDate.toISOString();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 60);
    const timeMax = maxDate.toISOString();

    let deleteErrors: string[] = [];
    let pageToken = "";
    let deletedCount = 0;
    
    do {
      const pageQuery = pageToken ? `&pageToken=${pageToken}` : "";
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&maxResults=250${pageQuery}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) break;

      const data = await response.json();
      const events = data.items || [];
      pageToken = data.nextPageToken || "";
      
      for (const event of events) {
        const isCampusOsEvent = event.summary && (
          event.summary.startsWith("[Campus OS]") || 
          event.summary.startsWith("Study: ") ||
          event.summary.startsWith("Work on ") ||
          event.summary.startsWith("Review: ")
        );
        const isActivity = event.description && event.description.includes("CampusOS-Activity-ID:");

        if (isActivity || isCampusOsEvent || (event.description && event.description.includes("Task Type:"))) {
          try {
            const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (deleteResponse.ok) deletedCount++;
          } catch (e: any) {
            deleteErrors.push(`Network error deleting ${event.id}: ${e.message}`);
          }
        }
      }
    } while (pageToken);
    
    // Finally, delete the account from Supabase vault
    await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_email", primaryEmail)
      .eq("account_email", accountEmail);

    return NextResponse.json({ success: true, deletedCount, deleteErrors });
  } catch (error: any) {
    console.error("[Wipe Account API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
