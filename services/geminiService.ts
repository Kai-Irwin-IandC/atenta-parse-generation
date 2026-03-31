
import { GoogleGenAI } from "@google/genai";
import { SignageSize } from "../types";

/**
 * 白紙部分を特定し、正確なサイズとパースで広告パネルに置き換えるシミュレーション画像を生成
 */
export const generateSignageSimulation = async (
  base64Image: string,
  size: SignageSize,
  includeWiring: boolean
): Promise<string> => {
  // Create instance inside the function to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const sizeText = size === SignageSize.INCH_25 ? "25-inch" : "32-inch";
  
  // Simplifed prompt emphasizing exact boundary matching
  const prompt = `
    TASK: Replace the white paper sheet in the image with a digital signage display.
    
    CRITICAL SPATIAL REQUIREMENT:
    - The digital signage panel MUST be the EXACT same size, position, and perspective as the white paper sheet.
    - Align every corner PRECISELY with the corners of the white paper. 
    - DO NOT extend beyond the boundaries of the paper.
    
    VISUAL SPECIFICATIONS:
    - Content: A professional digital page for a weather forecast with a modern blue and white color scheme.
    - Style: A high-quality LCD screen with a very thin black bezel.
    - Realism: The screen must look like a glowing monitor that naturally reflects the elevator's lighting and environment.
    
    ${includeWiring ? "Wiring: Show a thin white wiring cover extending vertically from the top of the monitor to the ceiling." : ""}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image.split(',')[1],
              mimeType: 'image/jpeg',
            },
          },
          { text: prompt },
        ],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("AIモデルからの応答がありません。");
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("応答に画像が含まれていません。");
  } catch (error) {
    console.error("Simulation generation error:", error);
    throw error;
  }
};
