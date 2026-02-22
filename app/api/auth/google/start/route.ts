import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "OAuth configuration missing" },
      { status: 500 }
    );
  }

  const scope = encodeURIComponent(
    "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive"
  );
  const state = Math.random().toString(36).substring(7);

  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&state=${state}`;

  return NextResponse.json({ url });
}
