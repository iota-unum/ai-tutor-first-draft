
import { Type } from '@google/genai';

const nestedSubIdeaSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    level: { type: Type.INTEGER },
    title: { type: Type.STRING, description: "Un titolo conciso, MASSIMO 3 parole, e unico tra i suoi fratelli." },
  },
  required: ['id', 'level', 'title'],
};

const subIdeaSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    level: { type: Type.INTEGER },
    title: { type: Type.STRING, description: "Un titolo conciso, MASSIMO 3 parole, e unico tra i suoi fratelli." },
    nested_sub_ideas: {
      type: Type.ARRAY,
      items: nestedSubIdeaSchema,
    },
  },
  required: ['id', 'level', 'title'],
};

const mainIdeaSchema = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING },
    level: { type: Type.INTEGER },
    title: { type: Type.STRING, description: "Un titolo conciso, MASSIMO 3 parole, e unico tra le altre idee principali." },
    sub_ideas: {
      type: Type.ARRAY,
      items: subIdeaSchema,
    },
  },
  required: ['id', 'level', 'title'],
};

export const outlineSchema = {
  type: Type.OBJECT,
  properties: {
    subject: { type: Type.STRING, description: "Argomento del testo" },
    description: { type: Type.STRING, description: "Descrizione generale del testo" },
    ideas: {
      type: Type.ARRAY,
      description: "Un array di esattamente 5 idee principali, ognuna con un titolo unico.",
      items: mainIdeaSchema,
    },
  },
  required: ['subject', 'description', 'ideas'],
};
