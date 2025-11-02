import React, { useState, useEffect } from 'react';
import { decodeBase64 } from '../utils/audioUtils';
import { Spinner } from './Spinner';
import JSZip from 'jszip';

declare const lamejs: any;

interface Step7FinalProps {
  audioSegments: string[];
  onRestart: () => void;
  subject: string;
}

const createFileName = (title: string, extension: string): string => {
    // Replace invalid characters with an underscore, trim, and convert to lowercase.
    const sanitized = title.replace(/[\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').toLowerCase();
    // Ensure the filename is not empty.
    return `${sanitized || 'podcast'}.${extension}`;
};

export const Step7Final: React.FC<Step7FinalProps> = ({ audioSegments, onRestart, subject }) => {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isZipping, setIsZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    
    const processAudio = () => {
        if (typeof lamejs === 'undefined') {
            setError("MP3 encoding library not loaded.");
            setIsLoading(false);
            return;
        }
        if (audioSegments.length === 0) {
            setError("No audio segments to process.");
            setIsLoading(false);
            return;
        }

        try {
            const pcmChunks = audioSegments.map(decodeBase64);
            
            const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const combinedPcm = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of pcmChunks) {
                combinedPcm.set(chunk, offset);
                offset += chunk.length;
            }

            const pcmSamples = new Int16Array(combinedPcm.buffer);

            const sampleRate = 24000;
            const numChannels = 1;
            const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
            const mp3Data = [];
            
            const sampleBlockSize = 1152;
            for (let i = 0; i < pcmSamples.length; i += sampleBlockSize) {
                const sampleChunk = pcmSamples.subarray(i, i + sampleBlockSize);
                const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
                if (mp3buf.length > 0) {
                    mp3Data.push(mp3buf);
                }
            }

            const end = mp3Encoder.flush();
            if (end.length > 0) {
                mp3Data.push(end);
            }

            const mp3Blob = new Blob(mp3Data, { type: 'audio/mp3' });
            url = URL.createObjectURL(mp3Blob);
            setDownloadUrl(url);
        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            console.error("Failed to combine and encode audio files:", err);
            setError(`Failed to create MP3 file: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const timer = setTimeout(processAudio, 100);

    return () => {
      clearTimeout(timer);
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioSegments]);
  
  const encodeSingleSegmentToMp3 = (base64Audio: string): Blob => {
    if (typeof lamejs === 'undefined') {
        throw new Error("MP3 encoding library not loaded.");
    }
    const pcmSamples = new Int16Array(decodeBase64(base64Audio).buffer);
    const sampleRate = 24000;
    const numChannels = 1;
    const mp3Encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128);
    const mp3Data = [];
    const sampleBlockSize = 1152;
    for (let i = 0; i < pcmSamples.length; i += sampleBlockSize) {
        const sampleChunk = pcmSamples.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3Encoder.encodeBuffer(sampleChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    const end = mp3Encoder.flush();
    if (end.length > 0) {
        mp3Data.push(end);
    }
    return new Blob(mp3Data, { type: 'audio/mp3' });
  };
  
  const handleDownloadZip = async () => {
    if (!audioSegments || audioSegments.length === 0) {
        setError("No audio segments to process for ZIP.");
        return;
    }
    
    setIsZipping(true);
    setError(null);
    
    try {
        const zip = new JSZip();
        for (let i = 0; i < audioSegments.length; i++) {
            const mp3Blob = encodeSingleSegmentToMp3(audioSegments[i]);
            zip.file(`podcast_segment_${i + 1}.mp3`, mp3Blob);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(zipBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = createFileName(subject + '_segments', 'zip');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
    } catch (e) {
        const err = e instanceof Error ? e : new Error('An unknown error occurred');
        console.error("Failed to create ZIP file:", err);
        setError(`Failed to create ZIP file: ${err.message}`);
    } finally {
        setIsZipping(false);
    }
  };


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
                <span className="text-lg text-gray-300 animate-pulse">Combining & Encoding...</span>
            </div>
        </>
      )}

      {!isLoading && error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6 w-full max-w-md" role="alert">
              <strong className="font-bold">Processing Failed: </strong>
              <span className="block sm:inline">{error}</span>
          </div>
      )}

      {!isLoading && !error && (
        <>
            <p className="text-gray-400 mb-8 max-w-lg">
                The audio segments have been combined into a single MP3 file. Download your complete podcast now.
            </p>
            <div className="w-full max-w-md space-y-4">
              {downloadUrl && (
                <a
                    href={downloadUrl}
                    download={createFileName(subject, 'mp3')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
                >
                    Download Full Podcast (.mp3)
                </a>
              )}
               <button
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isZipping ? (
                      <>
                          <Spinner />
                          <span className="ml-2">Creating ZIP...</span>
                      </>
                  ) : (
                      'Download All Segments (.zip)'
                  )}
               </button>
            </div>
        </>
      )}
      
      <div className="w-full max-w-md mt-6">
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