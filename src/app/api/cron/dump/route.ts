import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
    
    // We need the service role key to bypass RLS for a background cron job deleting tasks
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();

    console.log(`[Cron Dump] Initiating auto-dump for tasks overdue before ${now}...`);

    // Delete all pending tasks that have passed their deadline
    const { data, error, count } = await supabase
      .from("tasks")
      .delete({ count: "exact" })
      .lt("deadline", now)
      .eq("status", "pending");

    if (error) {
      console.error("[Cron Dump] Supabase error:", error);
      throw new Error(error.message);
    }

    console.log(`[Cron Dump] Successfully dumped ${count || 0} overdue tasks.`);

    return NextResponse.json({ 
      success: true, 
      message: `Auto-dump complete. Removed ${count || 0} overdue tasks.`,
      dumpedCount: count || 0
    });

  } catch (error: any) {
    console.error("[Cron Dump] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
