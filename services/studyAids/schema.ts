
import { Type } from '@google/genai';

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

export const studyAidsSchema = {
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
