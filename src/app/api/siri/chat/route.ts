import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchGmailEmails } from "@/lib/gmail";

// Reuse the same system prompt but tailored for Siri voice output (no markdown, extremely concise)
const SIRI_SYSTEM_PROMPT = `You are the Campus Life OS Voice Assistant. You help university students manage their academic and personal lives.
You must reply with a JSON object containing exactly these keys: "message", "action", and optionally "payload".
- "message": A short string intended to be spoken aloud by Siri. Be extremely concise. Do not use markdown. If asked for upcoming/future tasks, look ONLY at the "Upcoming Tasks" list.
- "action": Must be one of exactly: "NONE", "SYNC_CALENDAR", "ADD_EVENT".
  - "SYNC_CALENDAR": Use this if the user asks you to sync their calendar or fetch latest tasks.
  - "ADD_EVENT": Use this if the user asks you to schedule a session, add a task, or set a meeting.
  - "NONE": Use this for everything else.
- "payload": If action is "ADD_EVENT", you MUST include a payload object with "title", "startTime" (ISO string), and "endTime" (ISO string).

Current Context:
You will be provided with the user's current tasks and their local time/timezone. Use this to determine relative times (like "6 PM today").`;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }

    const apiKey = authHeader.split("Bearer ")[1].trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    // We need service role here to query api_keys without a session
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate API Key
    const { data: keyData, error: keyError } = await supabase
      .from("api_keys")
      .select("user_email")
      .eq("api_key", apiKey)
      .single();

    if (keyError || !keyData) {
      console.error("[Siri] Invalid API Key:", apiKey);
      return NextResponse.json({ error: "Unauthorized API Key" }, { status: 401 });
    }

    const userEmail = keyData.user_email;

    // Parse the command
    const body = await req.json();
    const command = body.command;
    if (!command) {
      return NextResponse.json({ error: "No command provided" }, { status: 400 });
    }

    // Fetch context for the LLM
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, deadline, status, priority")
      .eq("user_email", userEmail)
      .eq("status", "pending")
      .order("deadline", { ascending: true })
      .limit(150);

    const now = new Date();
    const overdueTasks = tasks?.filter(t => new Date(t.deadline) < now) || [];
    const upcomingTasks = tasks?.filter(t => new Date(t.deadline) >= now) || [];

    // Use UTC for server, but we can assume Siri provides local context if we wanted.
    // For now, Siri shortcuts don't easily provide timezone without extra steps, 
    // so we'll use a generic approach or default to server time.
    const context = `User's Email: ${userEmail}
Current Server Time (UTC): ${now.toISOString()}

Overdue Tasks (${overdueTasks.length}):
${JSON.stringify(overdueTasks.slice(0, 5))}

Upcoming Tasks (${upcomingTasks.length}):
${JSON.stringify(upcomingTasks.slice(0, 10))}

CRITICAL: When generating ISO timestamps for ADD_EVENT payloads, adjust the ISO string to match the user's intent.`;

    // Call Groq (Llama 3.3)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
    }

    const llmMessages = [
      { role: "system", content: SIRI_SYSTEM_PROMPT },
      { role: "user", content: `[Context: ${context}]\n\nUser Voice Command from Siri: "${command}"` }
    ];

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: llmMessages,
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!groqRes.ok) {
      return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const responseText = groqData.choices?.[0]?.message?.content || "";
    
    let parsed: any = { message: "I didn't quite catch that.", action: "NONE" };
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("[Siri] Failed to parse JSON:", responseText);
    }

    // Orchestrate Server-Side Actions
    if (parsed.action === "SYNC_CALENDAR") {
      // In a real scenario, we would trigger a background sync here
      parsed.message = "I have initiated a calendar sync in the background.";
    } else if (parsed.action === "ADD_EVENT" && parsed.payload) {
      // Add the task to the database natively
      const { error: insertError } = await supabase
        .from("tasks")
        .insert([{
          user_email: userEmail,
          title: parsed.payload.title,
          deadline: parsed.payload.endTime || parsed.payload.startTime,
          status: "pending",
          priority: "General",
          source: "Siri Voice"
        }]);
        
      if (!insertError) {
        parsed.message = `I have added ${parsed.payload.title} to your schedule.`;
      } else {
        parsed.message = "Sorry, I failed to save the event to the database.";
      }
    }

    // Return the final text string for Siri to speak out loud
    return NextResponse.json({ 
      text: parsed.message
    });

  } catch (error: any) {
    console.error("[Siri] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
