import { GoogleGenAI, Modality } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSpeech = async (scriptSegment: string, speaker1: string, speaker2: string): Promise<string> => {
    // Aggressively clean the script to ensure each line is in the format "Speaker: Text".
    // This removes leading/trailing whitespace and any markdown characters to prevent model confusion.
    const cleanedScriptSegment = scriptSegment
        .split('\n')
        .map(line => line.trim().replace(/\*/g, ''))
        .filter(line => line.length > 0)
        .join('\n');

    // The multiSpeakerVoiceConfig is the primary way to control voices.
    // The model automatically maps the speaker names in the script to the configured voices.
    // We pass the cleaned script directly without extra instructions.
    const ttsPrompt = cleanedScriptSegment;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsPrompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                languageCode: 'it-IT',
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        {
                            speaker: speaker1,
                            voiceConfig: {
                                prebuiltVoiceConfig: { 
                                    voiceName: 'Kore', // Female voice
                                }
                            }
                        },
                        {
                            speaker: speaker2,
                            voiceConfig: {
                                prebuiltVoiceConfig: { 
                                    voiceName: 'Puck', // Male voice
                                }
                            }
                        }
                    ]
                }
            }
        }
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
        throw new Error("Audio data not found in Gemini response.");
    }
    return base64Audio;
};