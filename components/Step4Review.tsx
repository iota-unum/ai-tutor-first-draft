
import React from 'react';
import { AudioPlayer } from './AudioPlayer';

interface Step4ReviewProps {
  audioSegments: string[];
  onConfirm: () => void;
}

export const Step4Review: React.FC<Step4ReviewProps> = ({ audioSegments, onConfirm }) => {
  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4 text-center">Review Audio Segments</h2>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        Listen to each generated audio segment to ensure everything sounds correct.
      </p>
      <div className="w-full space-y-4 mb-6">
        {audioSegments.map((base64Audio, index) => (
          <div key={index} className="bg-gray-700 p-4 rounded-lg flex items-center">
            <span className="font-bold text-lg text-purple-400 mr-4">Segment {index + 1}</span>
            <AudioPlayer base64Audio={base64Audio} />
          </div>
        ))}
      </div>
      <button
        onClick={onConfirm}
        className="w-full max-w-md bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
      >
        Combine & Finish
      </button>
    </div>
  );
};
