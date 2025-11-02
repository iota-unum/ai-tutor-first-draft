
import { MainIdea, SubIdea, NestedSubIdea } from '../../types';

type IdeaNode = MainIdea | SubIdea | NestedSubIdea;

export const generateStudyAidsPrompt = (node: IdeaNode): string => {
    const role = "Sei un esperto creatore di materiale didattico.";
    const task = "Genera materiale di studio basandoti sul testo fornito.";

    const rules = [
        "Crea ESATTAMENTE 3 flashcard e 3 domande di quiz a scelta multipla (con 4 opzioni ciascuna) che aiutino uno studente a ripassare e memorizzare i concetti chiave del contenuto fornito.",
        "Le flashcard devono essere concise e focalizzate sui concetti più importanti.",
        "Le domande del quiz devono essere chiare, non ambigue e avere una sola risposta corretta. Le altre opzioni devono essere plausibili ma errate.",
        "Attieniti rigorosamente al formato JSON richiesto.",
    ];

    return `
${role}
${task}

**CONTESTO:**
- Titolo del capitolo: "${node.title}"
- Contenuto del capitolo: "${node.content}"

**REGOLE:**
${rules.map(rule => `- ${rule}`).join('\n')}
`;
};
