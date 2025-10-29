import React, { useState, useEffect } from 'react';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompt: string;
  onSave: (newPrompt: string) => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ isOpen, onClose, prompt, onSave }) => {
  const [editedPrompt, setEditedPrompt] = useState(prompt);

  useEffect(() => {
    if (isOpen) {
      setEditedPrompt(prompt);
    }
  }, [isOpen, prompt]);

  const handleSave = () => {
    onSave(editedPrompt);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl text-left transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
            <h2 className="text-2xl font-bold mb-4">Edit Script Generation Prompt</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <p className="text-gray-400 mb-4">
          Modify the instructions given to the AI for creating the podcast script. The user-provided text will be appended to the end of this prompt.
        </p>
        <textarea
          value={editedPrompt}
          onChange={(e) => setEditedPrompt(e.target.value)}
          className="w-full h-64 p-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors font-mono"
          aria-label="Prompt Editor"
        />
        <div className="flex justify-end gap-4 mt-6">
          <button onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-6 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors font-semibold">Save Changes</button>
        </div>
      </div>
    </div>
  );
};
