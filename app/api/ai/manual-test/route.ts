import { NextResponse } from "next/server";

const apiKey = process.env.GEMINI_API_KEY;

export async function GET() {
  if (!apiKey) {
    return NextResponse.json({ error: "No API key" }, { status: 500 });
  }

  try {
    // Manual fetch tanpa SDK untuk test API key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "Say hello in one word",
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      data,
      apiKeyPrefix: apiKey.substring(0, 15) + "...",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown",
      },
      { status: 500 }
    );
  }
}



