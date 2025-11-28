import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY belum diset");
}

export async function GET() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // List available models
    const models = await genAI.listModels();

    return NextResponse.json({
      success: true,
      models: models.map(model => ({
        name: model.name,
        displayName: model.displayName,
        supportedGenerationMethods: model.supportedGenerationMethods,
      })),
      count: models.length,
    });
  } catch (error) {
    console.error("[ai/list-models] error", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Pastikan API key dari Google AI Studio (aistudio.google.com), bukan dari Google Cloud Console",
      },
      { status: 500 },
    );
  }
}



