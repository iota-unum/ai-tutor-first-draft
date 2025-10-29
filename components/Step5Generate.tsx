
import React from 'react';
import { Spinner } from './Spinner';

interface Step5GenerateProps {
    progressMessage: string;
}

export const Step5Generate: React.FC<Step5GenerateProps> = ({ progressMessage }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <h2 className="text-2xl font-semibold mb-4">Generating...</h2>
      <Spinner large={true} />
      <p className="text-gray-400 mt-6 text-lg animate-pulse">
        {progressMessage || 'Please wait while the AI works its magic...'}
      </p>
      <p className="text-gray-500 mt-2 text-sm">This may take a few moments.</p>
    </div>
  );
};
