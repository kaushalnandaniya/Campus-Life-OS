import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { addCalendarEvent } from "@/lib/gcal";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const primaryEmail = session.user.email.toLowerCase();
    const body = await req.json();
    const { title, startTime, endTime } = body;

    if (!title || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get primary account token from vault
    const { data: account, error } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_email", primaryEmail)
      .eq("account_email", primaryEmail)
      .single();

    if (error || !account) {
      throw new Error("Failed to fetch primary account token");
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
        const newExpiresAt = Date.now() + refreshedTokens.expires_in * 1000;
        await supabase.from("connected_accounts").update({
          access_token: accessToken,
          expires_at: newExpiresAt,
        }).eq("id", account.id);
      }
    }

    const eventId = await addCalendarEvent(accessToken, title, startTime, endTime);

    if (!eventId) {
      throw new Error("Failed to add event to Google Calendar");
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error: any) {
    console.error("[Calendar Add API] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
