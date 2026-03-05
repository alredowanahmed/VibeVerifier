import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface ScanResult {
  genderResult: "Girl" | "Boy";
  vibeIdentity: string;
  auraColor: string;
  chaosLevel: number;
  secretPower: string;
  theTruth: string;
  vocalAnalysis?: string;
}

export async function analyzeVibe(
  image: { base64: string; mimeType: string },
  audio?: { base64: string; mimeType: string }
): Promise<ScanResult> {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image, audio }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Scan failed');
    }

    return await response.json();
  } catch (error) {
    console.error("Scan failed:", error);
    throw error;
  }
}
