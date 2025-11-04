import { GoogleGenAI, Modality } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000; // Start with 1 second

export const generateSpeech = async (scriptSegment: string, speaker1: string, speaker2: string): Promise<string> => {
    // Clean the script segment but keep the line breaks and speaker tags
    const cleanedScript = scriptSegment
        .split('\n')
        .map(line => line.replace(/<mark[^>]*>/g, '').trim()) // remove mark tags
        .map(line => line.replace(/\*/g, '')) // remove asterisks
        .filter(line => line.trim().length > 0) // remove empty lines
        .join('\n');

    // Check if there is any actual dialogue to generate
    if (!cleanedScript.includes(`${speaker1}:`) && !cleanedScript.includes(`${speaker2}:`)) {
        // Return a short silent audio clip to prevent downstream errors
        return "AAA="; 
    }

    const ttsPrompt = `TTS the following conversation between ${speaker1} and ${speaker2} in a lively and engaging tone, with a fast and sustained pace. The language is Italian.\n\n${cleanedScript}`;
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
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
                                    speaker: speaker1, // e.g., 'Voce 1'
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: 'Kore' } // Female
                                    }
                                },
                                {
                                    speaker: speaker2, // e.g., 'Voce 2'
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: 'Puck' } // Male
                                    }
                                }
                            ]
                        }
                    }
                }
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                return base64Audio; // Success!
            }
            
            const reason = response.candidates?.[0]?.finishReason;
            const message = response.candidates?.[0]?.finishMessage;
            lastError = new Error(`Audio data not found. Reason: ${reason}, Message: ${message}`);
            console.warn(`Audio generation attempt ${attempt} failed: ${lastError.message}`);

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`Audio generation attempt ${attempt} threw an error:`, lastError);
        }
        
        // Don't wait after the last attempt
        if (attempt < MAX_RETRIES) {
             console.log(`Waiting ${RETRY_DELAY_MS * attempt}ms before retrying...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt)); // Linear backoff
        }
    }

    // If loop completes, all retries have failed.
    throw new Error(`Failed to generate audio for script segment after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`);
};


export const getPhonemeForWord = async (word: string): Promise<string> => {
  if (!word || !word.trim()) {
    throw new Error("Word cannot be empty.");
  }

  const prompt = `Fornisci la trascrizione fonetica IPA (International Phonetic Alphabet) per la seguente parola italiana. La tua risposta deve contenere SOLO la trascrizione IPA, senza alcuna formattazione, spiegazione, o testo aggiuntivo.

Parola: "${word.trim()}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    let ipa = response.text.trim();
    if (!ipa) {
        throw new Error("Received an empty response from the API.");
    }
    
    // The SSML standard for <phoneme ph="..."> expects the raw IPA string,
    // but LLMs sometimes wrap it in slashes (e.g., /.../). We need to remove them.
    if (ipa.startsWith('/') && ipa.endsWith('/')) {
        ipa = ipa.substring(1, ipa.length - 1);
    }

    return ipa;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`Failed to get phoneme for "${word}":`, err);
    throw new Error(`Could not generate phoneme for "${word}". ${err.message}`);
  }
};