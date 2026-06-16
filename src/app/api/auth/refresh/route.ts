import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Missing refreshToken" },
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
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token refresh failed:", tokens);
      return NextResponse.json(
        { error: tokens.error_description || "Token refresh failed" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in,
    });
  } catch (error) {
    console.error("Refresh route error:", error);
    return NextResponse.json(
      { error: "Internal server error during token refresh" },
      { status: 500 }
    );
  }
}
