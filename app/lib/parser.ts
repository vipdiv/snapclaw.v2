// Deterministic parser for OCR-extracted text
// Parses: "Mar 18, 2026", "10:00AM - 11:00AM CT", "JW Marriott"

export interface ParsedData {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    location: string;
}

const DATE_PATTERN = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/gi;
const TIME_PATTERN = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?(?:\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?)?/g;
const TIMEZONE_PATTERN = /\b(CT|CST|CDT|ET|EST|EDT|PT|PST|PDT|MT|MST|MDT)\b/gi;
const TITLE_MIN_LENGTH = 5;

export function parseExtractedText(text: string): { data: Partial<ParsedData>; confidence: number } {
    let confidence = 0;
    const data: Partial<ParsedData> = {};

  // Parse date (e.g., "Mar 18, 2026" → "2026-03-18")
  const dateMatch = DATE_PATTERN.exec(text);
    if (dateMatch) {
          const [, month, day, year] = dateMatch;
          const monthIndex = new Date(`${month} 1, 2000`).getMonth() + 1;
          data.date = `${year}-${String(monthIndex).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          confidence += 25;
    }

  // Parse time (e.g., "10:00AM - 11:00AM CT" → startTime, endTime, timezone)
  const timeMatch = TIME_PATTERN.exec(text);
    if (timeMatch) {
          const startHour = parseInt(timeMatch[1]);
          const startMin = timeMatch[2];
          const period = (timeMatch[3] || '').toUpperCase();

      let hour24 = startHour;
          if (period === 'PM' && startHour !== 12) hour24 += 12;
          if (period === 'AM' && startHour === 12) hour24 = 0;

      data.startTime = `${String(hour24).padStart(2, '0')}:${startMin}`;
          confidence += 25;

      // Parse end time if present
      if (timeMatch[4]) {
              const endHour = parseInt(timeMatch[4]);
              const endMin = timeMatch[5];
              const endPeriod = (timeMatch[6] || '').toUpperCase();

            let endHour24 = endHour;
              if (endPeriod === 'PM' && endHour !== 12) endHour24 += 12;
              if (endPeriod === 'AM' && endHour === 12) endHour24 = 0;

            data.endTime = `${String(endHour24).padStart(2, '0')}:${endMin}`;
      }
    }

  // Parse timezone (e.g., "CT" → "America/Chicago")
  const tzMatch = TIMEZONE_PATTERN.exec(text);
    if (tzMatch) {
          const tzCode = tzMatch[0].toUpperCase();
          const tzMap: Record<string, string> = {
                  'CT': 'America/Chicago', 'CST': 'America/Chicago', 'CDT': 'America/Chicago',
                  'ET': 'America/New_York', 'EST': 'America/New_York', 'EDT': 'America/New_York',
                  'PT': 'America/Los_Angeles', 'PST': 'America/Los_Angeles', 'PDT': 'America/Los_Angeles',
                  'MT': 'America/Denver', 'MST': 'America/Denver', 'MDT': 'America/Denver',
          };
          data.timezone = tzMap[tzCode] || 'America/Chicago';
          confidence += 20;
    } else {
          data.timezone = 'America/Chicago'; // Default
    }

  // Extract location (usually a line with capitalized words)
  const locationMatch = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Hotel|Inn|Restaurant|Cafe|Center|Hall|Building|Street|Avenue|Road|Parkway))?)\b/);
    if (locationMatch) {
          data.location = locationMatch[1];
          confidence += 15;
    }

  // Extract title (first sentence or meaningful phrase)
  const titleMatch = text.match(/^(.{5,100}?)(?:\n|$)/m);
    if (titleMatch && titleMatch[1].length >= TITLE_MIN_LENGTH) {
          data.title = titleMatch[1].trim();
          confidence += 15;
    }

  return { data, confidence };
}
