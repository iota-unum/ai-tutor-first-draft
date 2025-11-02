
import { GoogleGenAI } from '@google/genai';
import { generateScriptPrompt } from './prompt';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScript = async (finalContentJson: string): Promise<string> => {
  const prompt = generateScriptPrompt(finalContentJson);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });

  return response.text;
};
