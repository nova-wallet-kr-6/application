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

    // SDK versi saat ini tidak menyediakan listModels di tipe publik,
    // jadi endpoint ini hanya mengonfirmasi bahwa API key valid.
    const genAI = new GoogleGenerativeAI(apiKey);

    // Panggil satu model ringan hanya untuk memastikan API key berfungsi.
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("ping");
    const text = (await result.response).text();

    return NextResponse.json({
      success: true,
      message: "Gemini API key valid dan model dapat diakses.",
      sampleResponse: text,
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



