import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY belum diset",
        },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test dengan model yang benar
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });

    const result = await model.generateContent("Say hello in Indonesian");
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      model: "gemini-2.0-flash",
      message: text,
      apiKeyWorks: true
    });
  } catch (error) {
    console.error("[ai/test] error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}


