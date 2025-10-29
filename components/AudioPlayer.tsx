import React, { useState, useEffect, useRef, useCallback } from 'react';
import { decodeBase64 } from '../utils/audioUtils';

interface AudioPlayerProps {
  base64Audio: string;
}

const getAudioContext = (() => {
  let audioCtx: AudioContext | null = null;
  return () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
  };
})();

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  // FIX: Explicitly initialize useRef with undefined to fix "Expected 1 arguments, but got 0" error.
  const animationFrameRef = useRef<number | undefined>(undefined);
  const playbackStartTimeRef = useRef(0);
  const startOffsetRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    if (sourceRef.current) {
      // FIX: Pass argument to stop() to support older Web Audio API implementations.
      sourceRef.current.stop(0);
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    startOffsetRef.current = 0;
    setAudioBuffer(null);

    const audioContext = getAudioContext();

    const processAudio = async () => {
      try {
        const decodedPcm = decodeBase64(base64Audio);
        const dataInt16 = new Int16Array(decodedPcm.buffer);
        const frameCount = dataInt16.length;
        const buffer = audioContext.createBuffer(1, frameCount, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i] / 32768.0;
        }
        if (isMounted) {
          setAudioBuffer(buffer);
          setDuration(buffer.duration);
        }
      } catch (error) {
        console.error("Failed to decode audio data:", error);
      }
    };
    processAudio();

    return () => {
      isMounted = false;
    };
  }, [base64Audio]);

  const updateProgress = useCallback(() => {
    const audioContext = getAudioContext();
    const elapsedTime = audioContext.currentTime - playbackStartTimeRef.current;
    const newCurrentTime = startOffsetRef.current + elapsedTime;

    if (newCurrentTime >= duration) {
      setCurrentTime(duration);
      setIsPlaying(false);
      startOffsetRef.current = 0;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      setCurrentTime(newCurrentTime);
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, [duration]);

  const startPlayback = useCallback((offset: number) => {
    if (!audioBuffer) return;
    if (sourceRef.current) {
      // FIX: Pass argument to stop() to support older Web Audio API implementations.
      sourceRef.current.stop(0);
      sourceRef.current.disconnect();
    }

    const audioContext = getAudioContext();
    const newSource = audioContext.createBufferSource();
    newSource.buffer = audioBuffer;
    newSource.connect(audioContext.destination);

    sourceRef.current = newSource;
    playbackStartTimeRef.current = audioContext.currentTime;
    startOffsetRef.current = offset;
    newSource.start(0, offset);
    setIsPlaying(true);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [audioBuffer, updateProgress]);

  const stopPlayback = useCallback(() => {
    if (!sourceRef.current) return;
    // FIX: Pass argument to stop() to support older Web Audio API implementations.
    sourceRef.current.stop(0);
    sourceRef.current.disconnect();
    sourceRef.current = null;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    startOffsetRef.current = currentTime;
    setIsPlaying(false);
  }, [currentTime]);

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (currentTime >= duration) {
        setCurrentTime(0);
        startPlayback(0);
      } else {
        startPlayback(currentTime);
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const seekRatio = Math.max(0, Math.min(1, clickX / width));
    const newTime = duration * seekRatio;

    setCurrentTime(newTime);

    if (isPlaying) {
      startPlayback(newTime);
    } else {
      startOffsetRef.current = newTime;
    }
  };

  useEffect(() => {
      return () => {
          if (sourceRef.current) {
              // FIX: Pass argument to stop() to support older Web Audio API implementations.
              sourceRef.current.stop(0);
              sourceRef.current.disconnect();
          }
          if (animationFrameRef.current) {
              cancelAnimationFrame(animationFrameRef.current);
          }
      }
  }, []);

  return (
    <div className="flex-grow flex items-center ml-4">
      <button onClick={togglePlay} disabled={!audioBuffer} className="p-2 flex-shrink-0 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white transition-colors">
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.006v3.988a1 1 0 001.555.832l3.197-1.994a1 1 0 000-1.664l-3.197-1.994z" clipRule="evenodd" />
          </svg>
        )}
      </button>
      <div className="flex items-center w-full ml-4">
        <span className="text-xs text-gray-400 font-mono">{formatTime(currentTime)}</span>
        <div 
          ref={progressBarRef}
          onClick={handleSeek}
          className="w-full h-2 bg-gray-600 rounded-full mx-3 cursor-pointer group"
        >
          <div 
            className="h-2 bg-purple-400 rounded-full" 
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          ></div>
        </div>
        <span className="text-xs text-gray-400 font-mono">{formatTime(duration)}</span>
      </div>
    </div>
  );
};