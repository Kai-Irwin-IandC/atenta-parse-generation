
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
  
  // プロンプトを強化: 白紙の領域＝モニターの領域であることを厳密に指定
  const prompt = `
    Task: Precise Texture Replacement / Inpainting
    Input Image: An elevator interior with a white paper sheet taped to the wall.
    
    Objective: Replace the white paper sheet with a digital signage display.
    
    CRITICAL GEOMETRY INSTRUCTIONS:
    1. BOUNDARY MATCHING: The digital display must be generated EXACTLY within the boundaries of the white paper. 
    2. CORNER ALIGNMENT: The corners of the digital display must align PRECISELY with the corners of the white paper.
    3. NO RESIZING: Do not change the scale. The white paper represents the actual physical size of the screen (${sizeText}).
    4. PERSPECTIVE: The display must follow the exact surface plane and perspective distortion of the existing paper.
    
    VISUAL STYLE:
    - Object: A professional, vertical LCD digital signage panel with a very thin black bezel.
    - Screen Content: Display a corporate advertisement with the text "ATENTA" using a blue and white color scheme. The screen should look like a glowing LCD panel.
    - Lighting: The display must interact realistically with the elevator's lighting (reflections on the screen, shadows on the wall).
    - Surroundings: Do NOT modify the wall, handrails, or elevator doors. Only replace the paper.
    
    ${includeWiring ? "Wiring: Show a thin white wiring cover extending vertically from the top of the monitor to the ceiling." : "Wiring: No visible cables (concealed wiring)."}
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
