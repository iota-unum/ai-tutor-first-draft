
import React, { useState } from 'react';

interface Step4ScriptProps {
  script: string;
  onConfirm: (editedScript: string) => void;
  onGoBack: () => void;
}

export const Step4Script: React.FC<Step4ScriptProps> = ({ script, onConfirm, onGoBack }) => {
  const [editedScript, setEditedScript] = useState(script);

  const handleDownload = () => {
    const blob = new Blob([editedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'podcast-script.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4 text-center">Step 4: Review & Edit Your Podcast Script</h2>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        The script has been generated. You can now edit it directly, download it, or proceed to generate the audio.
      </p>
      <textarea
        value={editedScript}
        onChange={(e) => setEditedScript(e.target.value)}
        className="w-full h-80 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg mb-6 whitespace-pre-wrap font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        aria-label="Podcast script editor"
      />
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        <button
          onClick={onGoBack}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300"
        >
          Go Back
        </button>
        <button
          onClick={handleDownload}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-colors"
        >
          Download Script (.txt)
        </button>
        <button
          onClick={() => onConfirm(editedScript)}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
        >
          Looks Good, Generate Audio
        </button>
      </div>
    </div>
  );
};
