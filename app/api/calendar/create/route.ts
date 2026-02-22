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
        const { title, date, startTime, endTime, timezone = "America/Chicago", location } = body;

      if (!title) {
              return NextResponse.json(
                { error: "Title is required" },
                { status: 400 }
                      );
      }

      const accessToken = await getAccessToken(refreshToken);
        await createCalendarEvent(accessToken, title, date, startTime, endTime, timezone, location);

      return NextResponse.json({ success: true });
  } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Calendar error:", errorMessage);

      return NextResponse.json(
        { error: errorMessage || "Failed to create calendar event" },
        { status: 500 }
            );
  }
}
