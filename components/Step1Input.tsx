import React, { useState } from 'react';
import { Spinner } from './Spinner';

interface Step1InputProps {
  onGenerate: (text: string) => void;
  onGenerateFull: (text: string) => void;
  isLoading: boolean;
  progressMessage: string;
  onEditPrompt: () => void;
}

export const Step1Input: React.FC<Step1InputProps> = ({ onGenerate, onGenerateFull, isLoading, progressMessage, onEditPrompt }) => {
  const [text, setText] = useState('');

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
      <h2 className="text-2xl font-semibold mb-4 text-center">Enter Your Text</h2>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        Paste the content you want to convert into a podcast. The AI will generate a script for two speakers.
      </p>
      <form onSubmit={handleSubmit} className="w-full">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your article, blog post, or any text here..."
          className="w-full h-48 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
          disabled={isLoading}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <button
            type="button"
            onClick={onEditPrompt}
            disabled={isLoading}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
          >
            Edit Prompt
          </button>
          <button
            type="submit"
            disabled={isLoading || !text.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="ml-2">{progressMessage || 'Generating...'}</span>
              </>
            ) : (
              'Generate Script (Step-by-step)'
            )}
          </button>
           <button
            type="button"
            onClick={handleFullSubmit}
            disabled={isLoading || !text.trim()}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all"
          >
            {isLoading ? (
              <>
                <Spinner />
                <span className="ml-2">Working...</span>
              </>
            ) : (
              'Generate Full Podcast (Auto)'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};