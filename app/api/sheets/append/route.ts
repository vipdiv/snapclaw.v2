import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getOrCreateSpreadsheet, appendToSheet } from "../../utils/google";

export async function POST(request: NextRequest) {
      const refreshToken = request.cookies.get("refresh_token")?.value;
      if (!refreshToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  try {
          const body = await request.json();
          const { title, date, startTime, timezone = "America/Chicago", location, category, extractedText } = body;
          if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

        const accessToken = await getAccessToken(refreshToken);
          const spreadsheetId = await getOrCreateSpreadsheet(accessToken);
          const timestamp = new Date().toISOString();
          const row = [timestamp, "SIGNAL", title, date || "", startTime || "", location || "", category || "OTHER", extractedText || ""];
          await appendToSheet(accessToken, spreadsheetId, [row]);

        const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
          return NextResponse.json({ ok: true, sheetUrl, spreadsheetId });
  } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error("Sheets error:", err instanceof Error ? err.stack : msg);
          return NextResponse.json({ error: msg }, { status: 500 });
  }
}
