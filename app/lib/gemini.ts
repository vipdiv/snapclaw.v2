// Optional Gemini fallback for low-confidence parsing
// Only enabled if ENABLE_GEMINI=true

const ENABLE_GEMINI = process.env.ENABLE_GEMINI === 'true';

export interface GeminiParsedData {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    location: string;
}

export async function parseWithGemini(
    extractedText: string
  ): Promise<GeminiParsedData | null> {
    if (!ENABLE_GEMINI || !process.env.GEMINI_API_KEY) {
          return null;
    }

  try {
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                method: 'POST',
                headers: {
                          'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                          contents: [
                            {
                                          parts: [
                                            {
                                                              text: `Extract structured data from this text. Return ONLY valid JSON (no markdown). If a field is missing, use empty string.

                                                              Text:
                                                              ${extractedText}

                                                              Return JSON with exactly these fields:
                                                              {
                                                                "title": "string (event/item title)",
                                                                  "date": "YYYY-MM-DD",
                                                                    "startTime": "HH:MM",
                                                                      "endTime": "HH:MM",
                                                                        "timezone": "America/Chicago or similar",
                                                                          "location": "string"
                                                                          }`,
                                            },
                                                        ],
                            },
                                    ],
                          safetySettings: [
                            {
                                          category: 'HARM_CATEGORY_UNSPECIFIED',
                                          threshold: 'BLOCK_NONE',
                            },
                                    ],
                          generationConfig: {
                                      temperature: 0.1,
                                      maxOutputTokens: 256,
                          },
                }),
        });

      if (!response.ok) {
              console.error('Gemini API error:', response.statusText);
              return null;
      }

      const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!content) {
              return null;
      }

      // Extract JSON from response (might be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
                return null;
        }

      const parsed = JSON.parse(jsonMatch[0]) as GeminiParsedData;
        return parsed;
  } catch (err) {
        console.error('Gemini parsing error:', err);
        return null;
  }
}
