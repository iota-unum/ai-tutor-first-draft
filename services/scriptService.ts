
import { GoogleGenAI } from '@google/genai';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateScript = async (finalContentJson: string, promptTemplate: string): Promise<string> => {
  // FIX: Escaped backticks around `title`, `content`, etc. to prevent the TypeScript parser
  // from misinterpreting them, which was causing a "Cannot find name 'content'" error.
  const prompt = `${promptTemplate}

**ISTRUZIONI AGGIUNTIVE SULLA STRUTTURA:**
Il tuo compito è creare lo script del podcast basandoti sulla seguente struttura JSON, che rappresenta una mappa mentale dettagliata dell'argomento, **utilizzando esclusivamente i contenuti presenti nei campi \`content\` delle idee e sotto-idee (che contengono i summary generati)**. La conversazione deve essere guidata e strutturata dal JSON.

1.  **Segui la Struttura JSON:** Lo script deve essere diviso in 5 segmenti. Ogni segmento DEVE corrispondere a una delle 5 idee principali ("ideas") nel JSON. Il \`title\` e il \`content\` di ogni idea e sotto-idea sono la guida principale per il contenuto di quel segmento.
2.  **Copri Tutti i Punti:** Assicurati di discutere TUTTE le idee principali e le rispettive sotto-idee ("sub_ideas") elencate nel JSON, utilizzando i loro \`title\` e \`content\` come traccia.
3.  **Usa i Summary come Fonte:** La discussione tra i conduttori deve attingere esclusivamente ai contenuti forniti nei campi \`content\` di ciascuna idea e sotto-idea del JSON. Il tuo obiettivo è **espandere e approfondire questi concetti con esempi, analogie e spiegazioni più dettagliate per rendere la conversazione più ricca, coinvolgente e raggiungere una durata complessiva del podcast di circa 10-12 minuti.** NON fare riferimento a testi originali esterni o a informazioni non presenti nel JSON fornito.
4.  **REGOLA CRITICA SUL CONTENUTO:** Durante il dialogo, assicurati di menzionare e spiegare esplicitamente TUTTI i concetti chiave, le date, i nomi propri e le definizioni importanti *presenti nei summary (campi 'content' del JSON)* che sono pertinenti alle idee discusse. La conversazione deve essere naturale, ma non a scapito dell'accuratezza e della completezza informativa fornita dai summary.
5.  **INSERISCI TAG DI SINCRONIZZAZIONE:** Per ogni idea, sotto-idea e sotto-idea annidata ("nested_sub_ideas") presente nel JSON, devi inserire un tag speciale nel punto esatto dello script in cui inizia la discussione di quel punto.
    *   Il tag deve avere il formato \`<mark node="ID_DEL_NODO">\`, dove \`ID_DEL_NODO\` è il valore del campo \`id\` di quell'elemento nel JSON.
    *   Inserisci il tag su una riga a sé stante, immediatamente prima della battuta di dialogo che introduce l'argomento.
    *   Questi tag sono FONDAMENTALI per la sincronizzazione e non devono essere omessi. Esempio:
        \`\`\`
        <mark node="1.2.1">
        Voce 1: E qui arriviamo al punto cruciale...
        \`\`\`
**Struttura JSON Dettagliata (La tua traccia e guida):**
\`\`\`json
${finalContentJson}
\`\`\`

**Output:**
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};