
import React, { useState, useEffect } from 'react';
import { Spinner } from './Spinner';
import { OutlineEditor } from './OutlineEditor';

interface Step2InputProps {
  onGenerate: (text: string) => void;
  onGenerateFull: (text: string) => void;
  isLoading: boolean;
  progressMessage: string;
  inputText: string;
  onGoBack: () => void;
}

export const Step2Input: React.FC<Step2InputProps> = ({ onGenerate, onGenerateFull, isLoading, progressMessage, inputText, onGoBack }) => {
  const [text, setText] = useState(inputText);
  const [viewMode, setViewMode] = useState<'editor' | 'raw'>('editor');
  
  useEffect(() => {
    setText(inputText);
  }, [inputText]);

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
      <h2 className="text-2xl font-semibold mb-4 text-center">Step 2: Review and Confirm Outline</h2>
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
