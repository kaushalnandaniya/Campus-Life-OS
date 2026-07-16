import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const SYSTEM_PROMPT = `You are the Campus Life OS Voice Assistant. You help university students manage their academic and personal lives.
You must reply with a JSON object containing exactly two keys: "message" and "action".
- "message": A short, conversational string intended to be spoken aloud via Text-to-Speech. Be concise, but if the user explicitly asks for all their tasks, you MUST list them all. Do not use markdown.
- "action": Must be one of the following strings exactly: "NONE", "SYNC_CALENDAR".
  - If the user asks you to sync their calendar, pull emails, or fetch their latest tasks, set action to "SYNC_CALENDAR" and say you are doing so.
  - Otherwise, set action to "NONE".

Current Context:
You will be provided with the user's current tasks. Use them to answer questions about their schedule.`;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
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
      .limit(30);

    const context = `User has the following pending tasks: ${JSON.stringify(tasks || [])}`;

    // Call Groq (Llama 3.3)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY missing" }, { status: 500 });
    }

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Context: ${context}\n\nUser Voice Input: "${message}"` }
        ],
        temperature: 0.3,
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
    
    let parsed: { message: string; action: string } = { message: "I didn't quite catch that.", action: "NONE" };
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      console.error("[Agent Chat] Failed to parse JSON:", responseText);
    }

    // If the LLM decided to invoke the tool, we can trigger it server-side or let the client handle it.
    // For simplicity, we just pass the action to the client, and the client triggers the sync API.
    return NextResponse.json({
      reply: parsed.message || "I'm not sure how to help with that.",
      action: parsed.action === "SYNC_CALENDAR" ? "SYNC_CALENDAR" : "NONE"
    });

  } catch (error: any) {
    console.error("[Agent Chat] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
