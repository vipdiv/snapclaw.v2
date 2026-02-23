// app/api/utils/google.ts

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export async function getAccessToken(refreshToken: string): Promise<string> {
  const client_id = requireEnv("GOOGLE_CLIENT_ID");
  const client_secret = requireEnv("GOOGLE_CLIENT_SECRET");

  const body = new URLSearchParams({
    client_id,
    client_secret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as TokenResponse;

  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Failed to get access token");
  }

  return json.access_token;
}

export async function createCalendarEvent(
  accessToken: string,
  title: string,
  date: string, // yyyy-mm-dd
  startTime: string, // HH:mm
  endTime: string | undefined,
  timezone: string,
  location?: string
) {
  // Build RFC3339 start/end with timezone handled by Google via timeZone field
  // NOTE: date + time are local to the provided timezone
  const startDateTime = `${date}T${startTime}:00`;
  const endDateTime = endTime ? `${date}T${endTime}:00` : `${date}T${startTime}:00`;

  const payload: any = {
    summary: title,
    start: { dateTime: startDateTime, timeZone: timezone },
    end: { dateTime: endDateTime, timeZone: timezone },
  };

  if (location?.trim()) payload.location = location.trim();

  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to create calendar event");
  }

  return json;
}

export async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  // First, try to find an existing spreadsheet named "SnapClaw Log"
  const query = encodeURIComponent(`name = "SnapClaw Log" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false`);
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=1`;

  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const listJson = await listRes.json().catch(() => ({}));
  const existingId = listJson?.files?.[0]?.id;
  if (listRes.ok && existingId) return existingId;

  // Create new spreadsheet via Sheets API
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title: "SnapClaw Log" },
      sheets: [{ properties: { title: "Log" } }],
    }),
  });

  const createJson = await createRes.json().catch(() => ({}));

  if (!createRes.ok) {
    throw new Error(createJson?.error?.message || "Failed to create spreadsheet");
  }

  return createJson.spreadsheetId as string;
}

export async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  rows: string[][]
) {
  // Append to Log!A1
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Log!A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: rows,
    }),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(json?.error?.message || "Failed to append to sheet");
  }

  return json;
}
