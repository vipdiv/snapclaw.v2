export async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
      grant_type: "refresh_token",
    }).toString(),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Failed to refresh token: ${data.error}`);
  }

  return data.access_token;
}

export async function createCalendarEvent(
  accessToken: string,
  title: string,
  date: string,
  time: string,
  location: string
) {
  const startDateTime = date && time ? `${date}T${time}:00` : undefined;

  const event = {
    summary: title,
    location,
    ...(startDateTime && {
      start: { dateTime: startDateTime, timeZone: "UTC" },
      end: {
        dateTime: new Date(
          new Date(startDateTime).getTime() + 60 * 60 * 1000
        ).toISOString(),
        timeZone: "UTC",
      },
    }),
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create calendar event");
  }

  return response.json();
}

export async function getOrCreateSpreadsheet(
  accessToken: string
): Promise<string> {
  const listResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files?q=name='SnapClaw Log' and trashed=false&spaces=drive&pageSize=1",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const listData = await listResponse.json();

  if (listData.files && listData.files.length > 0) {
    return listData.files[0].id;
  }

  const createResponse = await fetch(
    "https://sheets.googleapis.com/v4/spreadsheets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          title: "SnapClaw Log",
        },
        sheets: [
          {
            properties: {
              sheetId: 0,
              title: "Log",
            },
          },
        ],
      }),
    }
  );

  const createData = await createResponse.json();
  return createData.spreadsheetId;
}

export async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  data: string[][]
) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Log!A:H:append`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: data,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to append to sheet");
  }

  return response.json();
}
