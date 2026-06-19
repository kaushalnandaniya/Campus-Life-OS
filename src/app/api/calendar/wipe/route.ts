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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get all connected accounts from vault
    const { data: accounts, error } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_email", primaryEmail);

    if (error || !accounts || accounts.length === 0) {
      throw new Error("Failed to fetch account tokens");
    }

    let totalDeletedCount = 0;

    for (const account of accounts) {
      let accessToken = account.access_token;

      // Refresh if needed
      if (account.expires_at < Date.now() + 60000) {
        if (!account.refresh_token) continue;
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
          await supabase.from("connected_accounts").update({
            access_token: accessToken,
            expires_at: newExpiresAt,
          }).eq("id", account.id);
        }
      }

      // Fetch all events
      const minDate = new Date();
      minDate.setDate(minDate.getDate() - 30); // look 30 days back to clean up history
      const timeMin = minDate.toISOString();
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 60); // same range as fetchCalendarEvents
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

        if (!response.ok) {
          break;
        }

        const data = await response.json();
        const events = data.items || [];
        pageToken = data.nextPageToken || "";
        
        // Delete events created by Campus OS
        for (const event of events) {
          const isCampusOsEvent = event.summary && (
            event.summary.startsWith("[Campus OS]") || 
            event.summary.startsWith("Study: ") ||
            event.summary.startsWith("Work on ") ||
            event.summary.startsWith("Review: ")
          );

          const isActivity = event.description && event.description.includes("CampusOS-Activity-ID:");

          if (!isActivity && (isCampusOsEvent || (event.description && event.description.includes("Task Type:")))) {
            try {
              const deleteResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}`, {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              
              if (deleteResponse.ok) {
                deletedCount++;
              } else {
                const errText = await deleteResponse.text();
                deleteErrors.push(`Failed to delete ${event.id}: ${deleteResponse.status} ${errText}`);
              }
            } catch (e: any) {
              deleteErrors.push(`Network error deleting ${event.id}: ${e.message}`);
            }
          }
        }
      } while (pageToken);
      
      totalDeletedCount += deletedCount;
      
      if (deleteErrors.length > 0) {
        return NextResponse.json({ 
          success: false, 
          error: "Some events failed to delete", 
          details: deleteErrors 
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, deletedCount: totalDeletedCount });
  } catch (error: any) {
    console.error("[Wipe API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
