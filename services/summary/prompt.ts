import { MainIdea } from '../../types';

export const generateSummaryPrompt = (
  idea: MainIdea,
  originalText: string,
  previousSummary: string | null
): string => {
  const role = "Sei un tutor eccezionale, specializzato nel rendere argomenti complessi accessibili a studenti di liceo.";
  const task = "Il tuo compito è creare un riassunto strutturato, coerente e comprensibile per uno studente liceale. È ASSOLUTAMENTE FONDAMENTALE che tu segua TUTTE le regole fornite, specialmente quella sulla lunghezza.";
  const output_format = "Il riassunto deve essere in formato markdown.";
  
  const rules = [
    "**REGOLA DI LUNGHEZZA CRITICA (NON SUPERARE):** Il riassunto per questa singola idea DEVE essere di **MASSIMO 400 parole**. Questo è un limite ASSOLUTO e NON negoziabile. Qualsiasi output che superi questo limite è considerato un fallimento. Sii conciso e vai dritto al punto.",
    "**Pubblico di Riferimento:** Il riassunto è per studenti liceali. Usa un linguaggio chiaro e diretto. Spiega i concetti complessi in modo semplice, usando analogie o esempi se necessario, senza banalizzare il contenuto.",
    "**Struttura Heading:** Utilizza la seguente gerarchia di heading markdown: `#` (H1) per l'idea principale (level 1), `##` (H2) per le sotto-idee (level 2), `###` (H3) per le sotto-idee annidate (level 3).",
    "**Corrispondenza Titoli:** Il testo di ogni heading (es. `# Titolo Idea`) DEVE CORRISPONDERE ESATTAMENTE al campo `title` dell'idea/sotto-idea corrispondente nel JSON fornito.",
    "**Nessun Testo Introduttivo:** **Questa è una regola critica.** L'output DEVE iniziare immediatamente con l'heading H1 (`#`) corrispondente al titolo dell'idea principale. NON AGGIUNGERE alcun paragrafo, frase o testo di introduzione prima del primo heading. Tutto il testo deve trovarsi sotto un heading appropriato.",
    "**Contenuto:** Sotto ogni heading, scrivi un paragrafo riassuntivo basato sul 'Testo Originale' e focalizzato su quell'idea specifica.",
  ];

  const ideaContext = JSON.stringify(idea, null, 2);

  let prompt = `
${role}
${task}
${output_format}

**ISTRUZIONI FONDAMENTALI (da seguire con la massima precisione):**
${rules.map(rule => `- ${rule}`).join('\n')}

**CONTESTO:**
Analizza il "Testo Originale" e crea un riassunto che segua rigorosamente la "Struttura Idea" fornita.

**Struttura Idea (focus di questo riassunto):**
\`\`\`json
${ideaContext}
\`\`\`
`;

  if (previousSummary) {
    prompt += `
**Contesto Precedente (riassunto dell'idea precedente):**
---
${previousSummary}
---
**Istruzione Chiave:** Assicurati che il nuovo riassunto si colleghi in modo naturale e logico al "Contesto Precedente", creando un discorso continuo. Non ripetere informazioni già presenti nel contesto precedente, ma costruisci su di esso. Ricorda di iniziare comunque con un heading H1.
`;
  }

  prompt += `
**Testo Originale (da cui estrarre le informazioni):**
---
${originalText}
---

**Output Atteso:**
Scrivi solo il riassunto in formato markdown per la "Struttura Idea" fornita, rispettando TUTTE le istruzioni. Inizia DIRETTAMENTE con un heading H1.
`;

  return prompt;
};