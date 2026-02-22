import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, createCalendarEvent } from "../../utils/google";

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, date, time, location } = body;

    const accessToken = await getAccessToken(refreshToken);
    await createCalendarEvent(accessToken, title, date, time, location);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Calendar error:", err);
    return NextResponse.json(
      { error: "Failed to create calendar event" },
      { status: 500 }
    );
  }
}
