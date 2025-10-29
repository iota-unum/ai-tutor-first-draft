import React from 'react';

interface StepperProps {
  currentStep: number;
  totalSteps: number;
  onStepClick?: (step: number) => void;
}

const getStepLabel = (step: number) => {
    switch(step) {
        case 1: return 'Upload';
        case 2: return 'Outline';
        case 3: return 'Summaries';
        case 4: return 'Generate';
        case 5: return 'Review';
        case 6: return 'Audio Gen';
        case 7: return 'Audio Rev';
        case 8: return 'Final';
        default: return `Step ${step}`;
    }
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, totalSteps, onStepClick }) => {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex items-start justify-between w-full max-w-3xl mx-auto px-2">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step;
        const isActive = currentStep === step;
        const isClickable = onStepClick && isCompleted;
        
        return (
            <React.Fragment key={step}>
            <div className="flex flex-col items-center text-center w-12">
                <div
                onClick={() => isClickable && onStepClick(step)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                    isActive ? 'bg-purple-600 text-white ring-4 ring-purple-500/50' : isCompleted ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                } ${isClickable ? 'cursor-pointer hover:bg-purple-500' : ''}`}
                >
                {step}
                </div>
                <p className={`mt-2 text-xs font-medium ${isActive ? 'text-purple-300' : isCompleted ? 'text-purple-400' : 'text-gray-500'}`}>
                  {getStepLabel(step)}
                </p>
            </div>
            {index < totalSteps - 1 && (
                <div
                className={`flex-1 h-1 mt-5 mx-1 rounded transition-all duration-500 ${
                    isCompleted ? 'bg-purple-600' : 'bg-gray-700'
                }`}
                ></div>
            )}
            </React.Fragment>
        );
      })}
    </div>
  );
};