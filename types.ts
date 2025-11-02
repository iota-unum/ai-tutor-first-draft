
// FIX: Removed self-referential import of `UploadedFile` which caused a name conflict.
export interface UploadedFile {
  name: string;
  content: string;
  selected: boolean;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface Project {
  id?: number;
  subject: string;
  createdAt: Date;
  uploadedFiles: UploadedFile[];
  outlineJson: string | null;
  outlineWithSummariesJson?: string | null;
  finalContentJson?: string | null;
  studyMaterialsJson?: string | null;
  fullScript: string | null;
  audioSegments: string[];
}


export interface AppState {
  currentStep: number;
  projectId: number | null;
  subject: string;
  uploadedFiles: UploadedFile[];
  outlineJson: string;
  outlineWithSummariesJson: string;
  finalContentJson: string;
  studyMaterialsJson: string;
  fullScript: string | null;
  scriptSegments: string[];
  audioSegments: string[];
  isLoading: boolean;
  error: string | null;
  progressMessage: string;
}


// Types for the parsed Outline JSON
export interface NestedSubIdea {
  id: string;
  level: number;
  title: string;
  content?: string;
  summary?: string;
  flashcards?: Flashcard[];
  quizQuestions?: QuizQuestion[];
}

export interface SubIdea {
  id:string;
  level: number;
  title: string;
  nested_sub_ideas?: NestedSubIdea[];
  content?: string;
  summary?: string;
  flashcards?: Flashcard[];
  quizQuestions?: QuizQuestion[];
}

export interface MainIdea {
  id: string;
  level: number;
  title: string;
  sub_ideas?: SubIdea[];
  summary?: string;
  content?: string;
  flashcards?: Flashcard[];
  quizQuestions?: QuizQuestion[];
}

export interface Outline {
  subject: string;
  description: string;
  ideas: MainIdea[];
}