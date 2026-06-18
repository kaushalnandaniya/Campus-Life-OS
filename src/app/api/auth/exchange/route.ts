import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, redirectUri } = body;

    if (!code || !redirectUri) {
      return NextResponse.json(
        { error: "Missing code or redirectUri" },
        { status: 400 }
      );
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokens);
      return NextResponse.json(
        { error: tokens.error_description || "Token exchange failed" },
        { status: 400 }
      );
    }

    // Now fetch the user's profile to get their email address
    const profileResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch profile data" },
        { status: 400 }
      );
    }

    const accountEmail = profileData.emailAddress.toLowerCase();

    // Get NextAuth session to know the primary user
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/app/api/auth/[...nextauth]/route");
    const session = await getServerSession(authOptions);
    
    if (session?.user?.email) {
      const primaryEmail = session.user.email.toLowerCase();
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      await supabase.from('connected_accounts').upsert({
        user_email: primaryEmail,
        account_email: accountEmail,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: Date.now() + tokens.expires_in * 1000
      }, { onConflict: 'user_email, account_email' });
    }

    return NextResponse.json({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      email: accountEmail,
    });
  } catch (error) {
    console.error("Exchange route error:", error);
    return NextResponse.json(
      { error: "Internal server error during token exchange" },
      { status: 500 }
    );
  }
}
