import { GoogleGenAI, Type } from '@google/genai';
import { Outline, MainIdea, SubIdea, NestedSubIdea, Flashcard, QuizQuestion } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const flashcardSchema = {
    type: Type.OBJECT,
    properties: {
        front: { type: Type.STRING, description: 'Il lato della flashcard con la domanda o il concetto chiave.' },
        back: { type: Type.STRING, description: 'Il lato della flashcard con la risposta o la spiegazione.' },
    },
    required: ['front', 'back'],
};

const quizQuestionSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: 'La domanda del quiz.' },
        options: {
            type: Type.ARRAY,
            description: 'Un array di esattamente 4 possibili risposte, una delle quali è corretta.',
            items: { type: Type.STRING },
        },
        correctAnswerIndex: { type: Type.INTEGER, description: "L'indice (da 0 a 3) della risposta corretta nell'array 'options'." },
    },
    required: ['question', 'options', 'correctAnswerIndex'],
};

const studyAidsSchema = {
    type: Type.OBJECT,
    properties: {
        flashcards: {
            type: Type.ARRAY,
            description: 'Un array di esattamente 3 flashcard.',
            items: flashcardSchema,
        },
        quizQuestions: {
            type: Type.ARRAY,
            description: 'Un array di esattamente 3 domande di quiz a scelta multipla.',
            items: quizQuestionSchema,
        },
    },
    required: ['flashcards', 'quizQuestions'],
};

const generateAidsForNode = async (node: MainIdea | SubIdea | NestedSubIdea): Promise<{ flashcards: Flashcard[], quizQuestions: QuizQuestion[] }> => {
    const prompt = `Sei un esperto creatore di materiale didattico. Basandoti sul seguente testo, genera materiale di studio.

**CONTESTO:**
- Titolo del capitolo: "${node.title}"
- Contenuto del capitolo: "${node.content}"

**COMPITO:**
Crea ESATTAMENTE 3 flashcard e 3 domande di quiz a scelta multipla (con 4 opzioni ciascuna) che aiutino uno studente a ripassare e memorizzare i concetti chiave del contenuto fornito.

**REGOLE:**
- Le flashcard devono essere concise e focalizzate sui concetti più importanti.
- Le domande del quiz devono essere chiare, non ambigue e avere una sola risposta corretta. Le altre opzioni devono essere plausibili ma errate.
- Attieniti rigorosamente al formato JSON richiesto.
`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: studyAidsSchema,
            },
        });
        
        const result = JSON.parse(response.text);
        
        // Basic validation
        if (result.flashcards && result.quizQuestions) {
            return result;
        }
        console.warn('Gemini response for study aids was valid JSON but empty. Node:', node.title);
        return { flashcards: [], quizQuestions: [] };
    } catch (e) {
        console.error(`Failed to generate study aids for node: ${node.title}`, e);
        return { flashcards: [], quizQuestions: [] }; // Return empty on error to not block the whole process
    }
};

type IdeaNode = MainIdea | SubIdea | NestedSubIdea;

const processNode = async (node: IdeaNode): Promise<void> => {
    const aids = await generateAidsForNode(node);
    node.flashcards = aids.flashcards;
    node.quizQuestions = aids.quizQuestions;

    const children: IdeaNode[] = (node as MainIdea).sub_ideas || (node as SubIdea).nested_sub_ideas || [];
    
    // Process children recursively in sequence to avoid overwhelming the API
    for (const child of children) {
        await processNode(child);
    }
};


export const generateStudyAids = async (finalContentJson: string): Promise<string> => {
    const outline: Outline = JSON.parse(finalContentJson);

    const outlineWithStudyAids: Outline = JSON.parse(JSON.stringify(outline));

    // Process all main ideas in sequence to avoid overwhelming the API
    for (const idea of outlineWithStudyAids.ideas) {
        await processNode(idea);
    }

    return JSON.stringify(outlineWithStudyAids, null, 2);
};