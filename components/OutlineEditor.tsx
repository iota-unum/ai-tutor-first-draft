
import React, { useState, useEffect, useCallback } from 'react';
import { Outline, MainIdea, SubIdea, NestedSubIdea } from '../types';

interface OutlineEditorProps {
  jsonString: string;
  onJsonStringChange: (newJsonString: string) => void;
}

const IdeaInput: React.FC<{
  idea: MainIdea | SubIdea | NestedSubIdea;
  path: (string | number)[];
  onTitleChange: (path: (string | number)[], newTitle: string) => void;
}> = ({ idea, path, onTitleChange }) => {
  return (
    <input
      type="text"
      value={idea.title}
      onChange={(e) => onTitleChange(path, e.target.value)}
      className="w-full bg-transparent p-1 rounded focus:bg-gray-700 focus:ring-1 focus:ring-purple-500 outline-none"
    />
  );
};


export const OutlineEditor: React.FC<OutlineEditorProps> = ({ jsonString, onJsonStringChange }) => {
  const [outline, setOutline] = useState<Outline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (jsonString) {
        const parsed = JSON.parse(jsonString);
        setOutline(parsed);
        setError(null);
      }
    } catch (e) {
      setError("Invalid JSON format. Please correct it in the 'Raw JSON' view.");
      setOutline(null);
    }
  }, [jsonString]);

  const handleTitleChange = useCallback((path: (string | number)[], newTitle: string) => {
    setOutline(currentOutline => {
      if (!currentOutline) return null;
      
      // Deep copy to avoid direct state mutation
      const newOutline = JSON.parse(JSON.stringify(currentOutline));
      
      let currentLevel: any = newOutline;
      for (let i = 0; i < path.length - 1; i++) {
        currentLevel = currentLevel[path[i]];
      }
      
      currentLevel[path[path.length - 1]].title = newTitle;
      
      onJsonStringChange(JSON.stringify(newOutline, null, 2));
      return newOutline;
    });
  }, [onJsonStringChange]);


  const renderIdeas = (ideas: (MainIdea | SubIdea | NestedSubIdea)[], parentPath: (string | number)[], level = 0) => {
    return (
      <ul className={`${level > 0 ? 'pl-6 border-l border-gray-700' : ''}`}>
        {ideas.map((idea, index) => {
          const currentPath = [...parentPath, index];
          const children = (idea as MainIdea).sub_ideas || (idea as SubIdea).nested_sub_ideas;
          const childrenKey = (idea as MainIdea).sub_ideas ? 'sub_ideas' : 'nested_sub_ideas';
          
          return (
            <li key={idea.id} className="my-2">
              <div className="flex items-center">
                 <span className={`mr-2 text-purple-400 ${level === 0 ? 'font-bold' : ''}`}>
                    {level === 0 ? `§${index + 1}` : '-'}
                </span>
                <IdeaInput idea={idea} path={currentPath} onTitleChange={handleTitleChange} />
              </div>
              {children && children.length > 0 && renderIdeas(children, [...currentPath, childrenKey], level + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  if (error) {
    return (
      <div className="w-full h-48 p-4 bg-red-900/20 border-2 border-red-700 rounded-lg flex items-center justify-center text-red-300">
        {error}
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg flex items-center justify-center text-gray-400">
        Loading outline...
      </div>
    );
  }

  return (
    <div className="w-full h-auto max-h-96 overflow-y-auto p-4 bg-gray-900 border-2 border-gray-700 rounded-lg">
        <h3 className="text-xl font-bold mb-2">{outline.subject}</h3>
        <p className="text-sm text-gray-400 mb-4">{outline.description}</p>
        {renderIdeas(outline.ideas, ['ideas'])}
    </div>
  );
};