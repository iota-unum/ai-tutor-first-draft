
import React from 'react';

interface SpinnerProps {
  large?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({ large = false }) => {
  const sizeClasses = large ? 'w-10 h-10' : 'w-5 h-5';
  return (
    <div
      className={`${sizeClasses} border-t-2 border-b-2 border-purple-400 rounded-full animate-spin`}
    ></div>
  );
};
