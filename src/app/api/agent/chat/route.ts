import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SYSTEM_PROMPT = `You are the Campus Life OS Voice Assistant. You help university students manage their academic and personal lives.
You must reply with a JSON object containing exactly these keys: "message", "action", "needsResponse", and optionally "payload".
- "message": A short, conversational string intended to be spoken aloud via Text-to-Speech. Keep it brief and natural, like a human assistant. DO NOT read out long lists of tasks. If there are many tasks, summarize (e.g., "You have 5 upcoming tasks, the next one is X"). Do not use markdown. If asked for upcoming/future tasks, look ONLY at the "Upcoming Tasks" list.
- "needsResponse": A boolean (true or false). Set to true ONLY if you end your message with a direct question that requires the user to reply immediately. Set to false otherwise.
- "action": Must be one of exactly: "NONE", "SYNC_CALENDAR", "ADD_EVENT".
  - "SYNC_CALENDAR": Use this if the user asks you to sync their calendar, pull emails, or fetch latest tasks.
  - "ADD_EVENT": Use this if the user asks you to schedule a session, add a task to the calendar, or set a meeting.
  - "NONE": Use this for everything else.
- "payload": If action is "ADD_EVENT", you MUST include a payload object with "title", "startTime" (ISO string), and "endTime" (ISO string). IMPORTANT: You MUST generate these ISO strings in the user's local timezone offset provided in the context, NOT UTC.

Current Context:
You will be provided with the user's current tasks and their local time/timezone. Use this to determine relative times (like "6 PM today").`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messages, localTime, timeZone } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    // Fetch context
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, deadline, status, priority")
      .eq("user_email", session.user.email)
      .eq("status", "pending")
      .order("deadline", { ascending: true })
      .limit(150);
      
    const now = new Date();
    const overdueTasks = tasks?.filter(t => new Date(t.deadline) < now) || [];
    const upcomingTasks = tasks?.filter(t => new Date(t.deadline) >= now) || [];

    const context = `User's Local Date/Time: ${localTime || new Date().toString()}
User's TimeZone: ${timeZone || 'Unknown'}

Overdue Tasks (${overdueTasks.length}):
${JSON.stringify(overdueTasks.slice(0, 10))} ${overdueTasks.length > 10 ? "...and more" : ""}

Upcoming Tasks (${upcomingTasks.length}):
${JSON.stringify(upcomingTasks.slice(0, 20))} ${upcomingTasks.length > 20 ? "...and more" : ""}

CRITICAL: When generating ISO timestamps for ADD_EVENT payloads, adjust the ISO string to include the correct timezone offset for the user's timezone (e.g. use +05:30 for IST instead of Z).`;

    // Call Groq (Llama 3.3)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
    }

    // Construct Groq messages
    // The last user message should get the context prepended to it to save context window and ensure high priority
    const llmMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    ];
    
    // Attach context to the very last message from the user
    const lastMsg = messages[messages.length - 1];
    llmMessages.push({
      role: lastMsg.role,
      content: `[Context: ${context}]\n\nUser Voice Input: "${lastMsg.content}"`
    });

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
      const errText = await groqRes.text();
      console.error("[Agent Chat] Groq Error:", errText);
      return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
    }

    const groqData = await groqRes.json();
    const responseText = groqData.choices?.[0]?.message?.content || "";
    
    let parsed: any = { message: "I didn't quite catch that.", action: "NONE", needsResponse: false };
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("[Agent Chat] Failed to parse JSON:", responseText);
    }

    return NextResponse.json({
      reply: parsed.message || "I'm not sure how to help with that.",
      action: parsed.action || "NONE",
      needsResponse: !!parsed.needsResponse,
      payload: parsed.payload || null
    });

  } catch (error: any) {
    console.error("[Agent Chat] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
