import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const stateCookie = request.cookies.get("oauth_state")?.value;

  if (!code) {
    return NextResponse.json({ error: "No code provided" }, { status: 400 });
  }

  if (!state || !stateCookie || state !== stateCookie) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
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

    if (!tokens.refresh_token) {
      return NextResponse.json(
        { error: "Google did not provide a refresh token" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.APP_BASE_URL || request.nextUrl.origin;
    const response = NextResponse.redirect(new URL("/", baseUrl));
    response.cookies.set("refresh_token", tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    response.cookies.delete("oauth_state");

    return response;
  } catch (err) {
    console.error("OAuth error:", err);
    return NextResponse.json(
      { error: "Failed to authenticate" },
      { status: 500 }
    );
  }
}
