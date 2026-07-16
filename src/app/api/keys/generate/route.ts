import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { createClient } from "@supabase/supabase-js";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any;
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Check if user already has an API key
    const { data: existingKeys, error: fetchError } = await supabase
      .from("api_keys")
      .select("api_key")
      .eq("user_email", session.user.email);

    if (fetchError) {
      console.error("[API Keys] Error fetching key:", fetchError);
      return NextResponse.json({ error: "Failed to fetch API key" }, { status: 500 });
    }

    if (existingKeys && existingKeys.length > 0) {
      return NextResponse.json({ apiKey: existingKeys[0].api_key });
    }

    // No key exists, generate a new one
    // Generate a secure random API key format: sk_live_xxx
    const randomBytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const newApiKey = `sk_live_${token}`;

    const { error: insertError } = await supabase
      .from("api_keys")
      .insert([
        {
          user_email: session.user.email,
          api_key: newApiKey
        }
      ]);

    if (insertError) {
      console.error("[API Keys] Error inserting new key:", insertError);
      return NextResponse.json({ error: "Failed to generate API key" }, { status: 500 });
    }

    return NextResponse.json({ apiKey: newApiKey });

  } catch (error: any) {
    console.error("[API Keys] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
