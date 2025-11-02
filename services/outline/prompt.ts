
export const generateOutlinePrompt = (text: string): string => {
  const role = "Sei un tutor che deve aiutare uno studente a comprendere e assimilare un argomento di studio nel minor tempo possibile. L'argomento e' quello del testo riportato sotto";
  const task = "Il tuo compito è generare una mappa mentale strutturata in formato JSON. La mappa mentale deve contenere un argomento, una descrizione generale ed esattamente 5 idee principali. Devi estrarre le idee principali utili a uno studente per superare una interrogazione sull'argomento. Ogni idea può avere sotto-idee annidate. Cerca di inserire tutte e solo le idee e sottoidee e sottosottoidee utili a uno studente liceale per superare una interrogazione";
  const rules = [
    "**LIMITE DI PAROLE:** Ogni campo 'title', a tutti i livelli, NON DEVE superare le 3 parole.",
    "**UNICITÀ:** I titoli delle 5 idee principali devono essere unici tra loro. Allo stesso modo, i titoli delle sotto-idee che appartengono allo stesso genitore devono essere unici tra loro. Questa regola si applica a tutti i livelli di annidamento.",
    "**LINGUA:** L'intero output JSON deve essere in italiano.",
    "**FORMATO:** Attieniti rigorosamente allo schema JSON fornito.",
  ];

  return `
${role}
${task}

**REGOLE FONDAMENTALI:**
${rules.map(rule => `- ${rule}`).join('\n')}

**Testo da analizzare:**
---
${text}
---
`;
};
