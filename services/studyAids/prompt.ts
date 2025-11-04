
import { MainIdea, SubIdea, NestedSubIdea } from '../../types';

type IdeaNode = MainIdea | SubIdea | NestedSubIdea;

/**
 * Recursively aggregates the title and content of a node and all its descendants
 * into a structured, indented string for the LLM prompt.
 * @param node The node to process.
 * @param indent The current indentation string.
 * @returns A string representing the content tree of the node.
 */
const aggregateNodeContent = (node: IdeaNode, indent = ''): string => {
    let content = `${indent}- Titolo: ${node.title}\n`;
    if (node.content && node.content.trim()) {
        const indentedContent = node.content.trim().split('\n').map(line => `${indent}  ${line}`).join('\n');
        content += `${indent}  Contenuto:\n${indentedContent}\n`;
    }

    const children: IdeaNode[] = (node as MainIdea).sub_ideas || (node as SubIdea).nested_sub_ideas || [];
    if (children.length > 0) {
        content += `${indent}  Sotto-argomenti:\n`;
        children.forEach(child => {
            content += aggregateNodeContent(child, indent + '    ');
        });
    }
    return content;
};

/**
 * Checks if a node or any of its descendants have content.
 * @param node The node to check.
 * @returns True if content exists, false otherwise.
 */
const hasContentRecursive = (node: IdeaNode): boolean => {
    if (node.content && node.content.trim()) {
        return true;
    }
    const children: IdeaNode[] = (node as MainIdea).sub_ideas || (node as SubIdea).nested_sub_ideas || [];
    return children.some(hasContentRecursive);
};


export const generateStudyAidsPrompt = (node: IdeaNode): string => {
    const role = "Sei un esperto creatore di materiale didattico, specializzato nel creare domande che stimolino il pensiero critico e la reale comprensione, non la semplice memorizzazione.";
    const task = "Genera materiale di studio di alta qualità basandoti sul testo fornito.";

    const rules = [
        "Crea ESATTAMENTE 3 flashcard e 3 domande di quiz a scelta multipla (con 4 opzioni ciascuna) che aiutino uno studente a ripassare e memorizzare i concetti chiave del contenuto fornito.",
        "Le flashcard devono essere concise e focalizzate sui concetti più importanti.",
        "Le domande del quiz devono essere chiare, non ambigue e avere una sola risposta corretta. Le altre opzioni devono essere plausibili ma errate.",
        "Attieniti rigorosamente al formato JSON richiesto.",
    ];
    
    const quality_rules = [
        "**EVITA LA BANALITÀ:** Non creare domande la cui risposta è palesemente contenuta nel titolo del capitolo o è l'argomento ovvio del capitolo. La domanda deve testare la comprensione del *contenuto*, non la capacità di leggere il titolo. Esempio da EVITARE: se il titolo è 'Rifiuto dell'Illuminazionismo', non chiedere 'Cosa viene rifiutato?'.",
        "**PROFONDITÀ, NON SUPERFICIALITÀ:** Le domande devono richiedere la comprensione di un concetto, una causa, un effetto o un confronto, non la semplice ripetizione di un nome o di una data già evidente dal contesto. La domanda deve avere valore anche se letta fuori dal contesto del capitolo specifico.",
        "**ESEMPIO DI MIGLIORAMENTO:** Invece di una domanda debole come 'Chi sosteneva il primato della volontà?' (risposta ovvia in un capitolo su Scoto), crea una domanda più forte come 'Quale facoltà umana Scoto considera superiore all'intelletto, e perché?', assumendo che il 'perché' sia spiegato nel testo.",
    ];

    // If the node and its children have no content, don't generate a prompt.
    if (!hasContentRecursive(node)) {
        return '';
    }

    const aggregatedContent = aggregateNodeContent(node);

    return `
${role}
${task}

**CONTESTO COMPLETO DELL'ARGOMENTO (da cui derivare il materiale di studio):**
Il materiale di studio deve essere basato sulla seguente struttura gerarchica di contenuti.
---
${aggregatedContent}
---

**COMPITO SPECIFICO:**
Crea materiale di studio (3 flashcard e 3 quiz) che copra l'argomento principale di alto livello: **"${node.title}"**.
Utilizza le informazioni dettagliate fornite nell'intero contesto soprastante per creare domande e risposte pertinenti e approfondite che riassumano i concetti chiave di questo argomento e dei suoi sotto-argomenti.

**REGOLE DI QUALITÀ (FONDAMENTALI):**
${quality_rules.map(rule => `- ${rule}`).join('\n')}

**REGOLE DI FORMATO:**
${rules.map(rule => `- ${rule}`).join('\n')}
`;
};