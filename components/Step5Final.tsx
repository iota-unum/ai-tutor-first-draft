import React, { useState, useEffect } from 'react';
import { decodeBase64, createWavBlob } from '../utils/audioUtils';
import { Spinner } from './Spinner';

interface Step5FinalProps {
  audioSegments: string[];
  onRestart: () => void;
}

export const Step5Final: React.FC<Step5FinalProps> = ({ audioSegments, onRestart }) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    
    const processAudio = () => {
        if (audioSegments.length === 0) {
            setError("No audio segments to process.");
            setIsLoading(false);
            return;
        }

        try {
            const pcmChunks = audioSegments.map(decodeBase64);
            const wavBlob = createWavBlob(pcmChunks);
            url = URL.createObjectURL(wavBlob);
            setDownloadUrl(url);
        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            console.error("Failed to combine audio files:", err);
            setError(`Failed to combine audio files: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Using a short timeout to allow the UI to render the loading state before blocking the main thread.
    const timer = setTimeout(processAudio, 100);

    return () => {
      clearTimeout(timer);
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioSegments]);

  return (
    <div className="flex flex-col items-center text-center">
      <h2 className="text-2xl font-semibold mb-4">Your Podcast is Ready!</h2>
      
      {isLoading && (
        <>
            <p className="text-gray-400 mb-6 max-w-lg">
                Please wait while the final audio file is being created. This should be quick!
            </p>
            <div className="flex items-center justify-center space-x-2">
                <Spinner large />
                <span className="text-lg text-gray-300 animate-pulse">Combining files...</span>
            </div>
        </>
      )}

      {!isLoading && error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 w-full max-w-md" role="alert">
              <strong className="font-bold">Processing Failed: </strong>
              <span className="block sm:inline">{error}</span>
          </div>
      )}

      {!isLoading && downloadUrl && !error && (
        <>
            <p className="text-gray-400 mb-8 max-w-lg">
                The audio segments have been combined into a single WAV file. Download your complete podcast now.
            </p>
            <a
                href={downloadUrl}
                download="podcast.wav"
                className="w-full max-w-md bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
            >
                Download Full Podcast (.wav)
            </a>
        </>
      )}
      
      <div className="w-full max-w-md mt-4">
        <button
          onClick={onRestart}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300"
        >
          Create Another Podcast
        </button>
      </div>
    </div>
  );
};