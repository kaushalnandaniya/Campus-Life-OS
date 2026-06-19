import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

// Helper to convert JS day indices (0=Sun, 1=Mon) to Google RRULE days
const RRULE_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, title, type, daysOfWeek, startTime, endTime } = await req.json();
    if (!id || !title || !daysOfWeek || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: accounts } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_email", (session as any).primaryEmail || session.user.email);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No connected accounts" }, { status: 400 });
    }

    // Build the RRULE
    const rruleDays = daysOfWeek.map((d: number) => RRULE_DAYS[d]).join(",");
    const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${rruleDays}`;

    // Build a specific start date using the FIRST upcoming day that matches the schedule
    // To keep it simple, we can just use today's date and let RRULE handle future recurrences
    // But Google Calendar requires a valid start DateTime
    const today = new Date();
    const [startHour, startMin] = startTime.split(":");
    const [endHour, endMin] = endTime.split(":");
    
    // Create start and end Dates for "today" to define the time window of the recurrence
    const startDateTime = new Date(today);
    startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0, 0);
    
    const endDateTime = new Date(today);
    endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0, 0);

    const event = {
      summary: `[Campus OS] ${title} ${type}`,
      description: `CampusOS-Activity-ID: ${id}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      recurrence: [rrule],
      reminders: {
        useDefault: true,
      },
    };

    let createdCount = 0;
    
    // We only push activities to the primary account to avoid duplicate recurring spam across 5 accounts
    const account = accounts[0];
    const accessToken = account.access_token;
    
    // First, let's try to find and DELETE an existing one just in case this is an update
    // We use the search query trick
    await deleteActivityFromGcal(accessToken, id);

    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (response.ok) {
      createdCount++;
    } else {
      console.error("[GCal Activity] Failed to create", await response.text());
    }

    return NextResponse.json({ success: true, createdCount });
  } catch (error: any) {
    console.error("[GCal Activity Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Missing activity ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: accounts } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("user_email", (session as any).primaryEmail || session.user.email);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: "No connected accounts" }, { status: 400 });
    }

    const account = accounts[0];
    const accessToken = account.access_token;

    await deleteActivityFromGcal(accessToken, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[GCal Activity Delete Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteActivityFromGcal(accessToken: string, activityId: string) {
  // Find events matching the Activity ID
  // Since we embed it in description, we can search via 'q' parameter
  const q = `CampusOS-Activity-ID: ${activityId}`;
  
  const searchRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!searchRes.ok) return;
  
  const data = await searchRes.json();
  const events = data.items || [];
  
  for (const ev of events) {
    if (ev.description && ev.description.includes(`CampusOS-Activity-ID: ${activityId}`)) {
      await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${ev.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      });
    }
  }
}
