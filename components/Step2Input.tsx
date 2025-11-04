
import React, { useState, useEffect, useMemo } from 'react';
import { Spinner } from './Spinner';
import { OutlineEditor } from './OutlineEditor';
import { Outline } from '../types';

interface Step2InputProps {
  onGenerate: (text: string) => void;
  onGenerateFull: (text: string) => void;
  isLoading: boolean;
  progressMessage: string;
  inputText: string;
  onGoBack: () => void;
}

const getTotalNodeCount = (outline: Outline | null): number => {
  if (!outline || !outline.ideas) return 0;
  
  let totalNodes = 0;
  const traverse = (nodes: any[]) => {
    if (!nodes) return;
    for (const node of nodes) {
      totalNodes++;
      if (node.sub_ideas) traverse(node.sub_ideas);
      if (node.nested_sub_ideas) traverse(node.nested_sub_ideas);
    }
  };
  traverse(outline.ideas);
  return totalNodes;
};

export const Step2Input: React.FC<Step2InputProps> = ({ onGenerate, onGenerateFull, isLoading, progressMessage, inputText, onGoBack }) => {
  const [text, setText] = useState(inputText);
  const [viewMode, setViewMode] = useState<'editor' | 'raw'>('editor');
  
  useEffect(() => {
    setText(inputText);
  }, [inputText]);

  const nodeCount = useMemo(() => {
    try {
      if (!text) return 0;
      const parsedOutline: Outline = JSON.parse(text);
      return getTotalNodeCount(parsedOutline);
    } catch (e) {
      return 0; // Return 0 if JSON is invalid or empty
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onGenerate(text);
    }
  };
  
  const handleFullSubmit = (e: React.MouseEvent) => {
    e.preventDefault();
    if (text.trim()){
      onGenerateFull(text);
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-2">
        <h2 className="text-2xl font-semibold text-left">Step 2: Review and Confirm Outline</h2>
        {nodeCount > 0 && (
          <div className="text-sm font-mono bg-gray-900 px-3 py-1 rounded-md border border-gray-700">
            Total Nodes: <span className="font-bold text-purple-400">{nodeCount}</span>
          </div>
        )}
      </div>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        The content from your files has been structured into an outline. Review or edit the titles below before generating the podcast script.
      </p>
      
      <div className="w-full mb-4 flex justify-center">
        <div className="inline-flex rounded-md shadow-sm bg-gray-900 p-1">
          <button
            onClick={() => setViewMode('editor')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${viewMode === 'editor' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Visual Editor
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${viewMode === 'raw' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
          >
            Raw JSON
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full">
        {viewMode === 'raw' ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your combined text will appear here..."
            className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors font-mono"
            disabled={isLoading}
            aria-label="Raw JSON outline editor"
          />
        ) : (
          <OutlineEditor jsonString={text} onJsonStringChange={setText} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <button
            type="button"
            onClick={onGoBack}
            disabled={isLoading}
            className="md:col-span-1 w-full bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            Go Back
          </button>
          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="md:col-span-1 w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="ml-2">{progressMessage || 'Generating...'}</span>
              </>
            ) : (
              'Generate Summaries'
            )}
          </button>
           <button
            type="button"
            onClick={handleFullSubmit}
            disabled={isLoading || !text.trim()}
            className="md:col-span-1 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="ml-2">Working...</span>
              </>
            ) : (
              'Generate Full Podcast'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
