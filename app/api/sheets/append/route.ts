import { NextRequest, NextResponse } from "next/server";
import {
  getAccessToken,
  getOrCreateSpreadsheet,
  appendToSheet,
} from "../../utils/google";

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
    const { title, date, time, location, category, extractedText } = body;

    const accessToken = await getAccessToken(refreshToken);
    const spreadsheetId = await getOrCreateSpreadsheet(accessToken);

    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      "SIGNAL",
      title,
      date,
      time,
      location,
      category,
      extractedText,
    ];

    await appendToSheet(accessToken, spreadsheetId, [row]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sheets error:", err);
    return NextResponse.json(
      { error: "Failed to log to sheet" },
      { status: 500 }
    );
  }
}
