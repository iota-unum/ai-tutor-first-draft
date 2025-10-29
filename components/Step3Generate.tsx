
import React from 'react';
import { Spinner } from './Spinner';

interface Step3GenerateProps {
    progressMessage: string;
}

export const Step3Generate: React.FC<Step3GenerateProps> = ({ progressMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-2xl font-semibold mb-4">Generating Audio</h2>
      <Spinner large={true} />
      <p className="text-gray-400 mt-6 text-lg animate-pulse">
        {progressMessage || 'Please wait while the AI generates the audio files...'}
      </p>
      <p className="text-gray-500 mt-2 text-sm">This may take a few moments.</p>
    </div>
  );
};
