import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: process.env.GOOGLE_REDIRECT_URI || "",
          grant_type: "authorization_code",
        }).toString(),
      }
    );

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      return NextResponse.json(
        { error: tokens.error_description },
        { status: 400 }
      );
    }

    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (err) {
    console.error("OAuth error:", err);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}
