
import { GoogleGenAI } from '@google/genai';
import { MainIdea } from '../../types';
import { generateSummaryPrompt } from './prompt';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSummaryForIdea = async (
  idea: MainIdea,
  originalText: string,
  previousSummary: string | null
): Promise<string> => {
  const prompt = generateSummaryPrompt(idea, originalText, previousSummary);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  
  console.log(response.text, "RIASSUNTO")
  return response.text;
};
