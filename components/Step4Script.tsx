
import React, { useState, useCallback } from 'react';
import { FlashcardViewer } from './FlashcardViewer';
import { QuizViewer } from './QuizViewer';
import { Outline } from '../types';

interface Step5ReviewContentProps {
  script: string;
  studyMaterialsJson: string;
  subject: string;
  onConfirm: (editedScript: string, editedStudyMaterialsJson: string) => void;
  onGoBack: () => void;
}

type ViewMode = 'script' | 'flashcards' | 'quiz';

const createFileName = (title: string, extension: string): string => {
    const sanitized = title.replace(/[\\?%*:|"<>]/g, '_').replace(/\s+/g, '-').toLowerCase();
    return `${sanitized || 'download'}.${extension}`;
};

const countWords = (text: string): number => {
  if (!text) return 0;
  // This regex handles multiple spaces and newlines and filters empty strings
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};


export const Step4Script: React.FC<Step5ReviewContentProps> = ({ script, studyMaterialsJson, subject, onConfirm, onGoBack }) => {
  const [editedScript, setEditedScript] = useState(script);
  const [editedMaterials, setEditedMaterials] = useState<Outline>(() => studyMaterialsJson ? JSON.parse(studyMaterialsJson) : { subject: '', description: '', ideas: []});
  const [viewMode, setViewMode] = useState<ViewMode>('script');
  
  const handleDownloadScript = () => {
    const blob = new Blob([editedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', createFileName(`${subject}-script`, 'txt'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleMaterialsUpdate = useCallback((updater: (prev: Outline) => Outline) => {
    setEditedMaterials(updater);
  }, []);

  const handleConfirm = () => {
      onConfirm(editedScript, JSON.stringify(editedMaterials, null, 2));
  };
  
  const renderContent = () => {
      if (!studyMaterialsJson) {
          return (
             <div className="w-full h-96 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">I materiali di studio non sono disponibili.</p>
             </div>
          );
      }
      switch(viewMode) {
          case 'script':
              return (
                  <>
                    <textarea
                      value={editedScript}
                      onChange={(e) => setEditedScript(e.target.value)}
                      className="w-full h-96 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg whitespace-pre-wrap font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      aria-label="Podcast script editor"
                    />
                    <div className="text-right text-sm text-gray-400 mt-2 pr-2">
                        Word Count: <span className="font-mono font-bold text-purple-300">{countWords(editedScript)}</span>
                    </div>
                  </>
              );
          case 'flashcards':
              return <FlashcardViewer outline={editedMaterials} onUpdate={handleMaterialsUpdate} />;
          case 'quiz':
              return <QuizViewer outline={editedMaterials} onUpdate={handleMaterialsUpdate} />;
          default:
              return null;
      }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4 text-center">Step 5: Review Generated Content</h2>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        Review and edit the podcast script, flashcards, and quizzes before generating the audio.
      </p>

      <div className="w-full mb-4 flex justify-center">
        <div className="inline-flex rounded-md shadow-sm bg-gray-900 p-1">
          <button
            onClick={() => setViewMode('script')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${viewMode === 'script' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Script
          </button>
          <button
            onClick={() => setViewMode('flashcards')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'flashcards' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Flashcards
          </button>
          <button
            onClick={() => setViewMode('quiz')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${viewMode === 'quiz' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Quiz
          </button>
        </div>
      </div>
      
      <div className="w-full mb-6">
        {renderContent()}
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
        <button
          onClick={onGoBack}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
        >
          Go Back
        </button>
        <button
          onClick={handleDownloadScript}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
        >
          Download Script (.txt)
        </button>
        <button
          onClick={handleConfirm}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all transform hover:scale-105"
        >
          Looks Good, Generate Audio
        </button>
      </div>
    </div>
  );
};

// Add some CSS for the flashcard flip animation
const style = document.createElement('style');
style.textContent = `
  .perspective-1000 { perspective: 1000px; }
  .transform-style-3d { transform-style: preserve-3d; }
  .rotate-y-180 { transform: rotateY(180deg); }
  .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
`;
document.head.appendChild(style);
