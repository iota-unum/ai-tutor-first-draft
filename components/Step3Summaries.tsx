

import React, { useState, useEffect, useCallback } from 'react';
import { Outline, MainIdea, SubIdea, NestedSubIdea } from '../types';

interface Step3SummariesProps {
  finalContentJson: string;
  onConfirm: (editedJson: string) => void;
  onGoBack: () => void;
}

const ContentEditor: React.FC<{
  idea: MainIdea | SubIdea | NestedSubIdea;
  onContentChange: (newContent: string) => void;
}> = React.memo(({ idea, onContentChange }) => {
  return (
    <textarea
      value={idea.content || ''}
      onChange={(e) => onContentChange(e.target.value)}
      className="w-full h-24 p-2 mt-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-1 focus:ring-purple-500 text-gray-300"
      aria-label="Content editor"
    />
  );
});

export const Step3Summaries: React.FC<Step3SummariesProps> = ({ finalContentJson, onConfirm, onGoBack }) => {
  const [outline, setOutline] = useState<Outline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (finalContentJson) {
        const parsed = JSON.parse(finalContentJson);
        setOutline(parsed);
        setError(null);
      }
    } catch (e) {
      setError("Invalid JSON data for summaries. Cannot display structured view.");
    }
  }, [finalContentJson]);

  const handleContentChange = useCallback((path: (string | number)[], newContent: string) => {
    setOutline(currentOutline => {
      if (!currentOutline) return null;
      
      const newOutline = JSON.parse(JSON.stringify(currentOutline));
      
      let currentLevel: any = newOutline;
      for (let i = 0; i < path.length - 1; i++) {
        currentLevel = currentLevel[path[i]];
      }
      
      const finalSegment = path[path.length - 1];
      currentLevel[finalSegment].content = newContent;
      
      return newOutline;
    });
  }, []);

  const renderIdeas = (ideas: (SubIdea | NestedSubIdea)[], parentPath: (string | number)[], level = 1) => {
    return (
      <div className={`${level > 1 ? 'pl-4 border-l-2 border-gray-600' : ''}`}>
        {ideas.map((idea, index) => {
          const currentPath = [...parentPath, index];
          const children = (idea as SubIdea).nested_sub_ideas;
          const childrenKey = 'nested_sub_ideas';
          
          return (
            <div key={idea.id} className="mt-3">
              {React.createElement(`h${level + 2}`, { className: "font-semibold text-gray-200" }, idea.title)}
              <ContentEditor 
                idea={idea} 
                onContentChange={(newContent) => handleContentChange(currentPath, newContent)} 
              />
              {children && children.length > 0 && renderIdeas(children, [...currentPath, childrenKey], level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  const getUpdatedJsonString = () => {
      return outline ? JSON.stringify(outline, null, 2) : finalContentJson;
  }

  if (error) {
    return <div className="text-red-400 text-center">{error}</div>;
  }

  if (!outline) {
    return <div className="text-gray-400 text-center">Loading structured summaries...</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4 text-center">Step 3: Review & Edit Summaries</h2>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        The summaries have been parsed and structured. Review and edit the content for each point before generating the script.
      </p>

      <div className="w-full space-y-4">
        {outline.ideas.map((idea, index) => (
          <details key={idea.id} className="bg-gray-700 rounded-lg p-4" open={index === 0}>
            <summary className="font-bold text-xl cursor-pointer text-purple-300">
              {idea.title}
            </summary>
            <div className="mt-2">
                <p className="text-sm text-gray-400 italic mb-2">Main idea content:</p>
                <ContentEditor 
                    idea={idea} 
                    onContentChange={(newContent) => handleContentChange(['ideas', index], newContent)} 
                />
            </div>
            {idea.sub_ideas && idea.sub_ideas.length > 0 && (
              <div className="mt-4">
                {renderIdeas(idea.sub_ideas, ['ideas', index, 'sub_ideas'])}
              </div>
            )}
          </details>
        ))}
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto mt-8">
        <button
          onClick={onGoBack}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
        >
          Go Back
        </button>
        <button
          onClick={() => onConfirm(getUpdatedJsonString())}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all transform hover:scale-105"
        >
          Confirm & Generate Content
        </button>
      </div>
    </div>
  );
};