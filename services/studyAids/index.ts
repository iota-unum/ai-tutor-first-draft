
import { GoogleGenAI } from '@google/genai';
import { Outline, MainIdea, SubIdea, NestedSubIdea, Flashcard, QuizQuestion } from '../../types';
import { generateStudyAidsPrompt } from './prompt';
import { studyAidsSchema } from './schema';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type IdeaNode = MainIdea | SubIdea | NestedSubIdea;

const generateAidsForNode = async (node: IdeaNode): Promise<{ flashcards: Flashcard[], quizQuestions: QuizQuestion[] }> => {
    const prompt = generateStudyAidsPrompt(node);
    
    // If the prompt is empty, it means the node and its children have no content, so we skip it.
    if (!prompt) {
        return { flashcards: [], quizQuestions: [] };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-lite',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: studyAidsSchema,
            },
        });
        
        const result = JSON.parse(response.text);
        
        // Basic validation
        if (result.flashcards && result.quizQuestions) {
            console.log("Flashcards",result)
            return result;
        }
        console.warn('Gemini response for study aids was valid JSON but empty. Node:', node.title);
        return { flashcards: [], quizQuestions: [] };
    } catch (e) {
        console.error(`Failed to generate study aids for node: ${node.title}`, e);
        
        return { flashcards: [], quizQuestions: [] }; // Return empty on error to not block the whole process
    }
};

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