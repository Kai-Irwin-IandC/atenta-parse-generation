
import { GoogleGenAI } from "@google/genai";
import { SignageSize } from "../types";

const getSignageSpec = (size: SignageSize) => {
  if (size === SignageSize.INCH_25) {
    return {
      sizeText: "25-inch",
      widthMm: 274.4,
      heightMm: 612.7,
      ratioText: "274.4:612.7 (W:H, portrait)",
    };
  }

  return {
    sizeText: "32-inch",
    widthMm: 422.6,
    heightMm: 728.2,
    ratioText: "422.6:728.2 (W:H, portrait)",
  };
};

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
  const signageSpec = getSignageSpec(size);
  
  // Simplified prompt emphasizing exact boundary matching
  const prompt = `
    TASK: Replace the white paper sheet in the image with a digital signage display.
    
    CRITICAL SPATIAL REQUIREMENT:
    - Keep the panel on the same wall plane and perspective as the white paper sheet.
    - The panel must remain fully inside the white paper boundaries (never overflow).
    - Preserve the selected physical aspect ratio exactly for the panel content and bezel.
    - If the paper shape and signage ratio differ, center-fit the panel within the paper with minimal margin.
    
    SIGNAGE SIZE SPEC (STRICT):
    - Selected size: ${signageSpec.sizeText}.
    - Physical dimensions: ${signageSpec.widthMm}mm (W) x ${signageSpec.heightMm}mm (H).
    - Aspect ratio to preserve: ${signageSpec.ratioText}.
    
    VISUAL SPECIFICATIONS:
    - Content: A professional digital page for a weather forecast with a modern blue and white color scheme.
    - Temperature unit: Use Celsius only (°C). Never use Fahrenheit (°F).
    - Style: A high-quality LCD screen with a very thin black bezel.
    - Realism: The screen must look like a glowing monitor that naturally reflects the elevator's lighting and environment.
    
    ${includeWiring ? "Wiring: Show a thin white wiring cover extending vertically from the top of the monitor to the ceiling." : ""}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      config: {
        temperature: 0.5,
      },
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

/**
 * 赤く塗られた領域を特定し、同じ位置・同じパースでサイネージに置き換えるシミュレーション画像を生成
 */
export const generateSignageSimulationFromMarkedArea = async (
  base64Image: string,
  size: SignageSize,
  includeWiring: boolean
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const signageSpec = getSignageSpec(size);

  const prompt = `
    TASK: Replace the red highlighted quadrilateral area in the image with a digital signage display.

    CRITICAL SPATIAL REQUIREMENT:
    - The digital signage panel MUST be the EXACT same size, position, and perspective as the red highlighted area.
    - Align every corner PRECISELY with the four corners of the red marked region.
    - DO NOT extend beyond the red boundaries.
    - Treat the red area as the installation target only.

    VISUAL SPECIFICATIONS:
    - Signage size: ${signageSpec.sizeText}.
    - Physical dimensions: ${signageSpec.widthMm}mm (W) x ${signageSpec.heightMm}mm (H).
    - Aspect ratio to preserve: ${signageSpec.ratioText}.
    - Content: A professional digital page for a weather forecast with a modern blue and white color scheme.
    - Temperature unit: Use Celsius only (°C). Never use Fahrenheit (°F).
    - Style: A high-quality LCD screen with a very thin black bezel.
    - Realism: The screen must look like a glowing monitor that naturally reflects the surrounding lighting and environment.

    ${includeWiring ? "Wiring: Show a thin white wiring cover extending vertically from the top of the monitor to the ceiling." : ""}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      config: {
        temperature: 0.5,
      },
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
    console.error("Marked-area simulation generation error:", error);
    throw error;
  }
};
