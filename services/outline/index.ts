
import { GoogleGenAI } from '@google/genai';
import { generateOutlinePrompt } from './prompt';
import { outlineSchema } from './schema';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOutline = async (text: string): Promise<string> => {
  const prompt = generateOutlinePrompt(text);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: outlineSchema,
    },
  });

  try {
    // Parse and re-stringify to ensure the response is valid and nicely formatted.
    const parsedData = JSON.parse(response.text);
    return JSON.stringify(parsedData, null, 2);
  } catch (e) {
    console.error("Gemini API returned non-JSON response despite schema:", response.text);
    throw new Error("Failed to parse the mind map from AI. The response was not valid JSON.");
  }
};
