import { GoogleGenAI, Type } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateOutline = async (text: string): Promise<string> => {
  const prompt = `Sei un tutor che deve aiutare uno studente a comprendere e assimilare questo testo nel minor tempo possibile. Il tuo compito è generare una mappa mentale strutturata in formato JSON. La mappa mentale deve contenere un argomento, una descrizione generale ed esattamente 5 idee principali.Devi estrarre le idee principali utili a uno studente per superare una interrogazione sull'argomento. Ogni idea può avere sotto-idee annidate. Attieniti rigorosamente allo schema JSON fornito.

**REGOLE FONDAMENTALI:**
1.  **LIMITE DI PAROLE:** Ogni campo 'title', a tutti i livelli, NON DEVE superare le 3 parole.
2.  **UNICITÀ:** I titoli delle 5 idee principali devono essere unici tra loro. Allo stesso modo, i titoli delle sotto-idee che appartengono allo stesso genitore devono essere unici tra loro. Questa regola si applica a tutti i livelli di annidamento.
3.  **LINGUA:** L'intero output JSON deve essere in italiano.

Testo da analizzare:
"${text}"`;

  const nestedSubIdeaSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      level: { type: Type.INTEGER },
      title: { type: Type.STRING, description: "Un titolo conciso, MASSIMO 3 parole, e unico tra i suoi fratelli." },
    },
    required: ['id', 'level', 'title'],
  };

  const subIdeaSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      level: { type: Type.INTEGER },
      title: { type: Type.STRING, description: "Un titolo conciso, MASSIMO 3 parole, e unico tra i suoi fratelli." },
      nested_sub_ideas: {
        type: Type.ARRAY,
        items: nestedSubIdeaSchema,
      },
    },
    required: ['id', 'level', 'title'],
  };

  const mainIdeaSchema = {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      level: { type: Type.INTEGER },
      title: { type: Type.STRING, description: "Un titolo conciso, MASSIMO 3 parole, e unico tra le altre idee principali." },
      sub_ideas: {
        type: Type.ARRAY,
        items: subIdeaSchema,
      },
    },
    required: ['id', 'level', 'title'],
  };

  const schema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING, description: "Argomento del testo" },
      description: { type: Type.STRING, description: "Descrizione generale del testo" },
      ideas: {
        type: Type.ARRAY,
        description: "Un array di esattamente 5 idee principali, ognuna con un titolo unico.",
        items: mainIdeaSchema,
      },
    },
    required: ['subject', 'description', 'ideas'],
  };
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  try {
    // Parse and re-stringify to ensure the response is valid and nicely formatted.
    // No data modification is done here.
    const parsedData = JSON.parse(response.text);
    return JSON.stringify(parsedData, null, 2);
  } catch (e) {
    console.error("Gemini API returned non-JSON response despite schema:", response.text);
    throw new Error("Failed to parse the mind map from AI. The response was not valid JSON.");
  }
};