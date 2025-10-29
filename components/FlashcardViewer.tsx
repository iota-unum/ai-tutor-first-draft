
import React, { useState, useCallback } from 'react';
import { Outline, MainIdea, SubIdea, NestedSubIdea, Flashcard } from '../types';

type IdeaNode = MainIdea | SubIdea | NestedSubIdea;

const EditableFlashcard: React.FC<{
    flashcard: Flashcard;
    onUpdate: (updatedFlashcard: Flashcard) => void;
}> = ({ flashcard, onUpdate }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    
    return (
        <div className="w-full h-48 perspective-1000" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transform-style-3d transition-transform duration-700 ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden bg-gray-700 rounded-lg p-4 flex flex-col justify-center items-center">
                    <textarea 
                        value={flashcard.front}
                        onChange={(e) => { e.stopPropagation(); onUpdate({ ...flashcard, front: e.target.value }); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-full bg-transparent text-center text-white resize-none text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-md"
                        aria-label="Flashcard front content"
                    />
                </div>
                {/* Back */}
                <div className="absolute w-full h-full backface-hidden bg-purple-800 rounded-lg p-4 flex flex-col justify-center items-center rotate-y-180">
                     <textarea 
                        value={flashcard.back}
                        onChange={(e) => { e.stopPropagation(); onUpdate({ ...flashcard, back: e.target.value }); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-full bg-transparent text-center text-white resize-none text-lg focus:outline-none focus:ring-2 focus:ring-purple-400 rounded-md"
                        aria-label="Flashcard back content"
                    />
                </div>
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
                            {idea.flashcards && idea.flashcards.map((fc, fcIndex) => (
                                <EditableFlashcard 
                                    key={fcIndex}
                                    flashcard={fc}
                                    onUpdate={(updatedFc) => {
                                        const newFlashcards = [...(idea.flashcards || [])];
                                        newFlashcards[fcIndex] = updatedFc;
                                        onUpdate([...currentPath, 'flashcards'], newFlashcards);
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


interface FlashcardViewerProps {
    outline: Outline;
    onUpdate: (updater: (prev: Outline) => Outline) => void;
}

export const FlashcardViewer: React.FC<FlashcardViewerProps> = ({ outline, onUpdate }) => {

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
