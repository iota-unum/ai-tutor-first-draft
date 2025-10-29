

import { GoogleGenAI } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScript = async (finalContentJson: string, originalText: string, promptTemplate: string): Promise<string> => {
  // FIX: Escaped backticks around `title`, `content`, etc. to prevent the TypeScript parser
  // from misinterpreting them, which was causing a "Cannot find name 'content'" error.
  const prompt = `${promptTemplate}

**ISTRUZIONI AGGIUNTIVE SULLA STRUTTURA:**
Il tuo compito è creare lo script del podcast basandoti sulla seguente struttura JSON, che rappresenta una mappa mentale dettagliata dell'argomento. La conversazione deve attingere ai contenuti forniti nei "Testi Originali" ma essere guidata e strutturata dal JSON.

1.  **Segui la Struttura JSON:** Lo script deve essere diviso in 5 segmenti. Ogni segmento DEVE corrispondere a una delle 5 idee principali ("ideas") nel JSON. Il \`title\` e il \`content\` di ogni idea e sotto-idea sono la guida principale per il contenuto di quel segmento.
2.  **Copri Tutti i Punti:** Assicurati di discutere TUTTE le idee principali e le rispettive sotto-idee ("sub_ideas") elencate nel JSON, usando i loro \`title\` e \`content\` come traccia.
3.  **Usa i Testi Originali come Fonte:** La discussione tra i conduttori deve espandere i concetti presenti nel \`content\` di ogni idea, usando le informazioni dettagliate contenute nei testi originali per arricchire la conversazione.

**Struttura JSON Dettagliata (La tua traccia e guida):**
\`\`\`json
${finalContentJson}
\`\`\`

**Testi Originali (La tua fonte di conoscenza dettagliata):**
${originalText}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });

  return response.text;
};