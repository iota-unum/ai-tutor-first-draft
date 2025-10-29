
import React, { useState, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import ePub from 'epubjs';
import { Spinner } from './Spinner';
import { UploadedFile } from '../types';
import { SavedProjects } from './SavedProjects';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.mjs';

interface Step1UploadProps {
  onProceed: (files: UploadedFile[]) => void;
  initialFiles: UploadedFile[];
  isLoading: boolean;
  progressMessage: string;
  onLoadProject: (id: number) => void;
}

type ProcessedFile = {
  id: string;
  name: string;
  status: 'parsing' | 'success' | 'error';
  content: string | null;
  selected: boolean;
  error?: string;
};

export const Step1Upload: React.FC<Step1UploadProps> = ({ onProceed, initialFiles, isLoading, progressMessage, onLoadProject }) => {
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState('');

  useEffect(() => {
    // This effect runs when returning to this step to restore state
    if (initialFiles.length > 0 && processedFiles.length === 0 && pastedText === '') {
      const pastedFile = initialFiles.find(f => f.name === 'Pasted Text');
      if (pastedFile) {
        setPastedText(pastedFile.content);
      }
      
      const filesToRestore: ProcessedFile[] = initialFiles
        .filter(f => f.name !== 'Pasted Text') // Don't show pasted text in the file list
        .map(f => ({
          id: `${f.name}-${Math.random()}`,
          name: f.name,
          status: 'success',
          content: f.content,
          selected: f.selected,
        }));
      setProcessedFiles(filesToRestore);
    }
  }, [initialFiles, processedFiles.length, pastedText]);

  const parseFile = async (file: File): Promise<string> => {
    if (file.type === 'text/plain') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error("Failed to read file"));
        reader.readAsText(file);
      });
    } else if (file.name.endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      return text;
    } else if (file.name.endsWith('.epub')) {
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub(arrayBuffer);
      const contents = await book.loaded.spine;
      let text = '';
      for (const item of contents.items) {
          if (item.href) {
            const doc = await book.load(item.href);
            if (doc.body) {
              text += doc.body.textContent + '\n\n';
            }
          }
      }
      return text;
    }
    throw new Error('Unsupported file type. Please upload .txt, .pdf, or .epub');
  };

  const handleFiles = useCallback(async (files: File[]) => {
    const newFiles: ProcessedFile[] = files.map(file => ({
      id: `${file.name}-${Math.random()}`,
      name: file.name,
      status: 'parsing',
      content: null,
      selected: true,
    }));
    
    setProcessedFiles(prev => [...prev, ...newFiles]);

    for (const file of newFiles) {
      try {
        const content = await parseFile(files.find(f => file.id.startsWith(f.name))!);
        setProcessedFiles(prev => prev.map(pf => pf.id === file.id ? { ...pf, status: 'success', content } : pf));
      } catch (e) {
        const error = e instanceof Error ? e : new Error('An unknown error occurred');
        setProcessedFiles(prev => prev.map(pf => pf.id === file.id ? { ...pf, status: 'error', error: error.message, selected: false } : pf));
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, [handleFiles]);

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const toggleSelection = (id: string) => {
    setProcessedFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };
  
  const toggleSelectAll = (select: boolean) => {
    setProcessedFiles(prev => prev.map(f => f.status === 'success' ? { ...f, selected: select } : f));
  };

  const handleProceed = () => {
    const filesForNextStep: UploadedFile[] = processedFiles
      .filter(f => f.status === 'success' && f.selected && f.content)
      .map(f => ({ name: f.name, content: f.content!, selected: true }));

    if (pastedText.trim()) {
      filesForNextStep.unshift({
        name: 'Pasted Text',
        content: pastedText.trim(),
        selected: true,
      });
    }
      
    onProceed(filesForNextStep);
  };

  const successfulFiles = processedFiles.filter(f => f.status === 'success');
  const selectedSuccessfulFiles = successfulFiles.filter(f => f.selected);
  const allSelected = successfulFiles.length > 0 && selectedSuccessfulFiles.length === successfulFiles.length;
  const canProceed = selectedSuccessfulFiles.length > 0 || pastedText.trim() !== '';

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl font-semibold mb-4 text-center">Step 1: Provide Your Content</h2>
      <p className="text-gray-400 mb-6 text-center max-w-lg">
        Start a new project by uploading documents, pasting text, or loading a saved project.
      </p>
      
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragEvents}
        onDragEnter={handleDragEvents}
        onDragLeave={handleDragEvents}
        className={`w-full p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${isDragging ? 'border-purple-500 bg-gray-700' : 'border-gray-600 hover:border-purple-400'}`}
      >
        <input type="file" id="file-upload" multiple onChange={handleFileChange} className="hidden" accept=".txt,.pdf,.epub"/>
        <label htmlFor="file-upload" className="cursor-pointer">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /></svg>
          <p className="mt-2 text-purple-400 font-semibold">Click to upload files</p>
          <p className="text-sm text-gray-500">or drag and drop</p>
        </label>
      </div>
      
      <div className="relative my-6 w-full">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-600" />
        </div>
        <div className="relative flex justify-center">
            <span className="bg-gray-800 px-3 text-lg font-medium text-gray-400">OR</span>
        </div>
      </div>
      
      <div className="w-full">
        <label htmlFor="pasted-text" className="block text-lg font-semibold mb-2 text-center text-gray-200">
            Paste Text Directly
        </label>
        <textarea
            id="pasted-text"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your article, blog post, or any text here..."
            className="w-full h-40 p-4 bg-gray-900 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
            aria-label="Paste text directly"
        />
      </div>

      {processedFiles.length > 0 && (
        <div className="w-full mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Uploaded Files</h3>
            <div>
              <button onClick={() => toggleSelectAll(true)} className="text-sm text-purple-400 hover:underline disabled:text-gray-500 disabled:no-underline" disabled={allSelected}>Select All</button>
              <span className="mx-2 text-gray-600">|</span>
              <button onClick={() => toggleSelectAll(false)} className="text-sm text-purple-400 hover:underline disabled:text-gray-500 disabled:no-underline" disabled={selectedSuccessfulFiles.length === 0}>Deselect All</button>
            </div>
          </div>
          <ul className="space-y-2 max-h-60 overflow-y-auto bg-gray-900 p-3 rounded-lg border border-gray-700">
            {processedFiles.map(file => (
              <li key={file.id} className="p-2 bg-gray-800 rounded flex items-center justify-between">
                <div className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={file.selected}
                    onChange={() => toggleSelection(file.id)}
                    disabled={file.status !== 'success'}
                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <span className="ml-3 truncate">{file.name}</span>
                </div>
                <div>
                  {file.status === 'parsing' && <Spinner />}
                  {file.status === 'success' && <span className="text-green-400 text-sm font-semibold">Ready</span>}
                  {file.status === 'error' && <span className="text-red-400 text-sm font-semibold" title={file.error}>Error</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 w-full">
         <button
            onClick={handleProceed}
            disabled={!canProceed || isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
          >
            {isLoading ? (
                <>
                    <Spinner />
                    <span className="ml-2">{progressMessage || 'Processing...'}</span>
                </>
            ) : (
                'Create New Project & Proceed'
            )}
          </button>
      </div>

      <SavedProjects onLoadProject={onLoadProject} />

    </div>
  );
};
