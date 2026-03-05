import { GoogleGenAI } from "@google/genai";

export interface ScanResult {
  genderResult: "Girl" | "Boy";
  vibeIdentity: string;
  auraColor: string;
  chaosLevel: number;
  secretPower: string;
  theTruth: string;
  vocalAnalysis?: string;
}

export async function analyzeVibeServer(
  image: { base64: string; mimeType: string },
  audio?: { base64: string; mimeType: string },
  apiKey?: string
): Promise<ScanResult> {
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const parts: any[] = [
      {
        inlineData: {
          data: image.base64,
          mimeType: image.mimeType,
        },
      },
    ];

    let promptText = `You are a "Bio-Vibe Scanner". Analyze this image`;
    
    if (audio) {
      parts.push({
        inlineData: {
          data: audio.base64,
          mimeType: audio.mimeType,
        },
      });
      promptText += ` and the accompanying voice recording`;
    }

    promptText += ` and generate a "Bio-Scan Report" in JSON format.
            
            The report must include:
            1. "genderResult": Strictly return either "Girl" or "Boy" based on visual appearance.
            2. "vibeIdentity": A creative, fun 2-3 word label for their aesthetic.
            3. "auraColor": A hex color code that matches their vibe.
            4. "chaosLevel": A number between 0 and 100 representing their chaotic energy.
            5. "secretPower": A funny, fictional "superpower" they look like they have.
            6. "theTruth": A one-sentence "verified fact" about their personality based on the photo (keep it funny and lighthearted).`;

    if (audio) {
      promptText += `
            7. "vocalAnalysis": A one-sentence analysis of their "sonic signature" or voice vibe.`;
    }

    promptText += `
            IMPORTANT: This is for entertainment purposes.
            
            Return ONLY the JSON object.`;

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from scanner");
    
    return JSON.parse(text) as ScanResult;
  } catch (error) {
    console.error("Scan failed:", error);
    throw error;
  }
}
