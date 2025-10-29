
import React, { useCallback } from 'react';
import { Outline, MainIdea, SubIdea, NestedSubIdea, QuizQuestion } from '../types';

type IdeaNode = MainIdea | SubIdea | NestedSubIdea;

const EditableQuiz: React.FC<{
    quiz: QuizQuestion;
    onUpdate: (updatedQuiz: QuizQuestion) => void;
}> = ({ quiz, onUpdate }) => {
    return (
        <div className="w-full bg-gray-700 rounded-lg p-4">
            <textarea 
                value={quiz.question}
                onChange={(e) => onUpdate({ ...quiz, question: e.target.value })}
                className="w-full bg-gray-800 p-2 rounded-md mb-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Quiz question"
            />
            <div className="space-y-2">
                {quiz.options.map((option, index) => (
                    <div key={index} className="flex items-center">
                        <input 
                            type="radio"
                            name={`quiz-${quiz.question}-${Math.random()}`} // ensure unique name
                            checked={index === quiz.correctAnswerIndex}
                            onChange={() => onUpdate({ ...quiz, correctAnswerIndex: index })}
                            className="h-4 w-4 text-purple-600 bg-gray-900 border-gray-600 focus:ring-purple-500"
                        />
                         <input 
                            type="text"
                            value={option}
                            onChange={(e) => {
                                const newOptions = [...quiz.options];
                                newOptions[index] = e.target.value;
                                onUpdate({ ...quiz, options: newOptions });
                            }}
                            className={`ml-3 w-full p-1 rounded-md text-white ${index === quiz.correctAnswerIndex ? 'bg-green-800/50' : 'bg-gray-800/50'} focus:outline-none focus:ring-1 focus:ring-purple-500`}
                            aria-label={`Quiz option ${index + 1}`}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};


const renderIdeas = (
    ideas: IdeaNode[],
    parentPath: (string | number)[],
    onUpdate: (path: (string | number)[], updatedData: any) => void,
    level = 0
) => {
    return (
        <div className={level > 0 ? 'pl-4 mt-4 border-l-2 border-gray-600' : ''}>
            {ideas.map((idea, index) => {
                const currentPath = [...parentPath, index];
                const children: IdeaNode[] = (idea as MainIdea).sub_ideas || (idea as SubIdea).nested_sub_ideas || [];
                const childrenKey = (idea as MainIdea).sub_ideas ? 'sub_ideas' : 'nested_sub_ideas';

                return (
                    <div key={idea.id} className="mb-6">
                        <h3 className={`font-bold ${level === 0 ? 'text-xl text-purple-300' : 'text-lg text-purple-400'}`}>
                            {idea.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            {idea.quizQuestions && idea.quizQuestions.map((qq, qqIndex) => (
                                <EditableQuiz 
                                    key={qqIndex}
                                    quiz={qq}
                                    onUpdate={(updatedQq) => {
                                        const newQuizQuestions = [...(idea.quizQuestions || [])];
                                        newQuizQuestions[qqIndex] = updatedQq;
                                        onUpdate([...currentPath, 'quizQuestions'], newQuizQuestions);
                                    }}
                                />
                            ))}
                        </div>
                        {children.length > 0 && renderIdeas(children, [...currentPath, childrenKey], onUpdate, level + 1)}
                    </div>
                );
            })}
        </div>
    );
};

interface QuizViewerProps {
    outline: Outline;
    onUpdate: (updater: (prev: Outline) => Outline) => void;
}

export const QuizViewer: React.FC<QuizViewerProps> = ({ outline, onUpdate }) => {
    
    const handleUpdate = useCallback((path: (string | number)[], updatedData: any) => {
        onUpdate(currentOutline => {
            if (!currentOutline) return currentOutline;
            const newOutline = JSON.parse(JSON.stringify(currentOutline));
            let currentLevel: any = newOutline;
            for (let i = 0; i < path.length - 1; i++) {
                currentLevel = currentLevel[path[i]];
            }
            currentLevel[path[path.length - 1]] = updatedData;
            return newOutline;
        });
    }, [onUpdate]);

    return (
        <div className="w-full h-96 overflow-y-auto p-4 bg-gray-900 border-2 border-gray-700 rounded-lg">
            {outline?.ideas && renderIdeas(outline.ideas, ['ideas'], handleUpdate)}
        </div>
    );
};
