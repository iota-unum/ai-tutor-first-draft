import { GoogleGenAI } from '@google/genai';
import { MainIdea } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSummaryForIdea = async (
  idea: MainIdea,
  originalText: string,
  previousSummary: string | null
): Promise<string> => {
  const ideaContext = JSON.stringify(idea, null, 2);

  let prompt = `Sei un assistente AI specializzato nella sintesi di testi complessi. Il tuo compito è creare un riassunto strutturato e coerente in formato markdown, seguendo delle regole ferree.

**ISTRUZIONI FONDAMENTALI (da seguire con la massima precisione):**
1.  **Struttura Heading:** Utilizza la seguente gerarchia di heading markdown:
    *   \`#\` (H1) per l'idea principale (level 1).
    *   \`##\` (H2) per le sotto-idee (level 2).
    *   \`###\` (H3) per le sotto-idee annidate (level 3).
2.  **Corrispondenza Titoli:** Il testo di ogni heading (es. \`# Titolo Idea\`) DEVE CORRISPONDERE ESATTAMENTE al campo \`title\` dell'idea/sotto-idea corrispondente nel JSON fornito.
3.  **Nessun Testo Introduttivo:** **Questa è una regola critica.** L'output DEVE iniziare immediatamente con l'heading H1 (\`#\`) corrispondente al titolo dell'idea principale. NON AGGIUNGERE alcun paragrafo, frase o testo di introduzione prima del primo heading. Tutto il testo deve trovarsi sotto un heading appropriato.
4.  **Contenuto:** Sotto ogni heading, scrivi un paragrafo riassuntivo basato sul "Testo Originale" e focalizzato su quell'idea specifica.
5. **Lunghezza:** Il riassunto non deve superare le 500 parole.
Analizza il "Testo Originale" e crea un riassunto che segua rigorosamente la "Struttura Idea" fornita.

**Struttura Idea (focus di questo riassunto):**
\`\`\`json
${ideaContext}
\`\`\`
`;

  if (previousSummary) {
    prompt += `
**Contesto Precedente (riassunto dell'idea precedente):**
${previousSummary}

**Istruzione Chiave:** Assicurati che il nuovo riassunto si colleghi in modo naturale e logico al "Contesto Precedente", creando un discorso continuo. Non ripetere informazioni già presenti nel contesto precedente, ma costruisci su di esso. Ricorda di iniziare comunque con un heading H1.
`;
  }

  prompt += `
**Testo Originale (da cui estrarre le informazioni):**
---
${originalText}
---

**Output:**
Scrivi solo il riassunto in formato markdown per la "Struttura Idea" fornita, rispettando TUTTE le istruzioni. Inizia DIRETTAMENTE con un heading H1.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
console.log(response.text, "RIASSUNTO")
  return response.text;
};
