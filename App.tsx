
import React, { useState, useCallback, useEffect } from 'react';
import { Stepper } from './components/Stepper';
import { Step1Upload } from './components/Step1Upload';
import { Step2Input } from './components/Step2Input';
import { Step3Summaries } from './components/Step3Summaries';
import { Step4Script } from './components/Step4Script'; // This is now Step5ReviewContent
import { Step5Generate } from './components/Step5Generate';
import { Step6Review } from './components/Step6Review';
import { Step7Final } from './components/Step7Final';
import { generateSpeech } from './services/geminiService';
import { generateOutline } from './services/outline';
import { generateScript } from './services/script';
import { generateSummaryForIdea } from './services/summary';
import { generateStudyAids } from './services/studyAids';
import { generateFinalContentJson } from './services/markdownParser';
import { AppState, UploadedFile, Project, Outline } from './types';
import { SCRIPT_SEPARATOR } from './constants';
import { addProject, updateProject, getProject } from './services/db';


const correctVoiceAlternation = (script: string): string => {
  const lines = script.split('\n');
  let lastSpeaker: 'Voce 1' | 'Voce 2' | null = null;
  const correctedLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    let currentSpeaker: 'Voce 1' | 'Voce 2' | null = null;

    if (trimmedLine.startsWith('Voce 1:')) {
      currentSpeaker = 'Voce 1';
    } else if (trimmedLine.startsWith('Voce 2:')) {
      currentSpeaker = 'Voce 2';
    }

    if (currentSpeaker) {
      if (currentSpeaker === lastSpeaker) {
        // Same speaker as last line, flip it
        const newSpeaker = currentSpeaker === 'Voce 1' ? 'Voce 2' : 'Voce 1';
        const lineContent = trimmedLine.substring(currentSpeaker.length + 1).trim();
        correctedLines.push(`${newSpeaker}: ${lineContent}`);
        lastSpeaker = newSpeaker;
      } else {
        // Different speaker, keep it
        correctedLines.push(line); // push original line to preserve whitespace
        lastSpeaker = currentSpeaker;
      }
    } else {
      // Not a speaker line (e.g., separator or empty line), just add it
      correctedLines.push(line);
      // If it's a segment separator, reset the last speaker to ensure alternation across segments
      if (trimmedLine === SCRIPT_SEPARATOR) {
        lastSpeaker = null;
      }
    }
  }

  // Final pass to ensure the first line of a new segment alternates from the last line of the previous one
  const finalScript = correctedLines.join('\n');
  const segments = finalScript.split(SCRIPT_SEPARATOR);
  if (segments.length <= 1) {
    return finalScript;
  }

  const correctedSegments = [segments[0]];
  for (let i = 1; i < segments.length; i++) {
      const prevSegment = correctedSegments[i-1].trim();
      let currentSegment = segments[i].trim();
      
      const prevLines = prevSegment.split('\n').filter(l => l.trim().startsWith('Voce 1:') || l.trim().startsWith('Voce 2:'));
      const lastLineOfPrev = prevLines[prevLines.length - 1];

      const currentLines = currentSegment.split('\n');
      const firstLineOfCurrent = currentLines.find(l => l.trim().startsWith('Voce 1:') || l.trim().startsWith('Voce 2:'));

      if (lastLineOfPrev && firstLineOfCurrent && lastLineOfPrev.startsWith('Voce 1:') && firstLineOfCurrent.trim().startsWith('Voce 1:')) {
          currentSegment = currentSegment.replace('Voce 1:', 'Voce 2:');
      } else if (lastLineOfPrev && firstLineOfCurrent && lastLineOfPrev.startsWith('Voce 2:') && firstLineOfCurrent.trim().startsWith('Voce 2:')) {
          currentSegment = currentSegment.replace('Voce 2:', 'Voce 1:');
      }
      correctedSegments.push(currentSegment);
  }

  return correctedSegments.join(`\n\n${SCRIPT_SEPARATOR}\n\n`);
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    currentStep: 1,
    projectId: null,
    subject: '',
    uploadedFiles: [],
    outlineJson: '',
    outlineWithSummariesJson: '',
    finalContentJson: '',
    studyMaterialsJson: '',
    fullScript: null,
    scriptSegments: [],
    audioSegments: [],
    isLoading: false,
    error: null,
    progressMessage: '',
  });

  const handleReset = () => {
    setAppState({
      currentStep: 1,
      projectId: null,
      subject: '',
      uploadedFiles: [],
      outlineJson: '',
      outlineWithSummariesJson: '',
      finalContentJson: '',
      studyMaterialsJson: '',
      fullScript: null,
      scriptSegments: [],
      audioSegments: [],
      isLoading: false,
      error: null,
      progressMessage: '',
    });
  };

  const handleFilesProceed = async (files: UploadedFile[]) => {
    const combinedText = files
      .filter(f => f.selected)
      .map(f => `--- START OF ${f.name} ---\n\n${f.content}\n\n--- END OF ${f.name} ---`)
      .join('\n\n');

    setAppState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      progressMessage: 'Generating outline from content...',
      uploadedFiles: files,
      // Reset subsequent steps
      outlineWithSummariesJson: '',
      finalContentJson: '',
      studyMaterialsJson: '',
      fullScript: null,
      scriptSegments: [],
      audioSegments: [],
    }));

    try {
      const outlineJsonString = await generateOutline(combinedText);
      const outlineJson = JSON.parse(outlineJsonString);
      const subject = outlineJson.subject || 'Untitled Project';
      const formattedJson = JSON.stringify(outlineJson, null, 2);

      const newProject: Omit<Project, 'id'> = {
          subject,
          createdAt: new Date(),
          uploadedFiles: files,
          outlineJson: formattedJson,
          fullScript: null,
          audioSegments: [],
      };
      const newProjectId = await addProject(newProject);
      
      setAppState(prev => ({
        ...prev,
        projectId: newProjectId,
        subject: subject,
        outlineJson: formattedJson,
        currentStep: 2,
        isLoading: false,
        progressMessage: '',
      }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error('An unknown error occurred');
      console.error(error);
      setAppState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: `Outline Generation Failed: ${error.message}`,
      }));
    }
  };

  const handleSummaryGeneration = async (jsonOutline: string) => {
    setAppState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null, 
        outlineJson: jsonOutline, 
        progressMessage: 'Generating summaries...',
        outlineWithSummariesJson: '',
        finalContentJson: '',
        studyMaterialsJson: '',
        fullScript: null,
        scriptSegments: [],
        audioSegments: [],
    }));

    const originalText = appState.uploadedFiles
      .filter(f => f.selected)
      .map(f => `--- START OF ${f.name} ---\n\n${f.content}\n\n--- END OF ${f.name} ---`)
      .join('\n\n');

    try {
        const outline: Outline = JSON.parse(jsonOutline);
        let previousSummary: string | null = null;
        const outlineWithSummaries: Outline = JSON.parse(JSON.stringify(outline)); // deep copy

        for (let i = 0; i < outlineWithSummaries.ideas.length; i++) {
            setAppState(prev => ({...prev, progressMessage: `Generating summary for idea ${i + 1} of ${outlineWithSummaries.ideas.length}...`}));
            const summary = await generateSummaryForIdea(outlineWithSummaries.ideas[i], originalText, previousSummary);
            outlineWithSummaries.ideas[i].summary = summary;
            previousSummary = summary;
        }

        const outlineWithSummariesJson = JSON.stringify(outlineWithSummaries, null, 2);
        
        setAppState(prev => ({...prev, progressMessage: `Parsing and structuring summaries...`}));
        const finalContentOutline = generateFinalContentJson(outlineWithSummaries);
        const finalContentJson = JSON.stringify(finalContentOutline, null, 2);

        if (appState.projectId) {
            await updateProject(appState.projectId, { 
                outlineJson: jsonOutline, 
                outlineWithSummariesJson,
                finalContentJson,
            });
        }

        setAppState(prev => ({
            ...prev,
            isLoading: false,
            outlineWithSummariesJson,
            finalContentJson,
            currentStep: 3,
            progressMessage: '',
        }));

    } catch (e) {
        const error = e instanceof Error ? e : new Error('An unknown error occurred');
        console.error(error);
        setAppState(prev => ({ ...prev, isLoading: false, error: `Summary Generation Failed: ${error.message}` }));
    }
  };


  const handleContentGeneration = async (finalContentJson: string) => {
    setAppState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null, 
        finalContentJson: finalContentJson, 
        progressMessage: 'Generating script & study materials...',
        currentStep: 4, // go to loading view
        audioSegments: [],
    }));
      
    try {
        setAppState(prev => ({...prev, progressMessage: 'Generating podcast script...'}));
        const scriptPromise = generateScript(finalContentJson)
            .then(rawScript => correctVoiceAlternation(rawScript));
        
        setAppState(prev => ({...prev, progressMessage: 'Generating flashcards & quizzes...'}));
        const studyAidsPromise = generateStudyAids(finalContentJson);

        const [script, studyMaterialsJson] = await Promise.all([scriptPromise, studyAidsPromise]);

        const segments = script.split(SCRIPT_SEPARATOR).map(s => s.trim()).filter(s => s.length > 0);
        
        if (appState.projectId) {
            await updateProject(appState.projectId, { 
                fullScript: script, 
                finalContentJson: finalContentJson, 
                studyMaterialsJson,
                audioSegments: [] 
            });
        }

        setAppState(prev => ({
            ...prev,
            isLoading: false,
            fullScript: script,
            scriptSegments: segments,
            studyMaterialsJson: studyMaterialsJson,
            currentStep: 5, // move to new review step
            progressMessage: ''
        }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error('An unknown error occurred');
      console.error(error);
      setAppState(prev => ({ ...prev, isLoading: false, currentStep: 3, error: `Content Generation Failed: ${error.message}` }));
    }
  };

  const handleAudioGeneration = useCallback(async (editedScript: string, editedStudyMaterialsJson: string) => {
    const newSegments = editedScript.split(SCRIPT_SEPARATOR).map(s => s.trim()).filter(s => s.length > 0);
    
    setAppState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null, 
      currentStep: 6, // loading view for audio
      fullScript: editedScript,
      studyMaterialsJson: editedStudyMaterialsJson,
      scriptSegments: newSegments,
    }));
    
    const speaker1 = 'Voce 1';
    const speaker2 = 'Voce 2';
    const audioResults: string[] = [];

    try {
      for (let i = 0; i < newSegments.length; i++) {
        setAppState(prev => ({ ...prev, progressMessage: `Generating audio for segment ${i + 1} of ${newSegments.length}...` }));
        const audioData = await generateSpeech(newSegments[i], speaker1, speaker2);
        audioResults.push(audioData);
      }

      if (appState.projectId) {
          await updateProject(appState.projectId, { 
              audioSegments: audioResults, 
              fullScript: editedScript, 
              studyMaterialsJson: editedStudyMaterialsJson 
            });
      }

      setAppState(prev => ({
        ...prev,
        audioSegments: audioResults,
        isLoading: false,
        currentStep: 7, // move to audio review view
        progressMessage: ''
      }));
    } catch (e) {
      const error = e instanceof Error ? e : new Error('An unknown error occurred');
      console.error(error);
      setAppState(prev => ({ ...prev, isLoading: false, currentStep: 5, error: `Audio Generation Failed: ${error.message}` }));
    }
  }, [appState.projectId]);

  const handleFullGeneration = async (jsonOutline: string) => {
     setAppState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null, 
        outlineJson: jsonOutline, 
        currentStep: 4, // go to a generic loading view
        audioSegments: [],
     }));
     
     const originalText = appState.uploadedFiles
      .filter(f => f.selected)
      .map(f => `--- START OF ${f.name} ---\n\n${f.content}\n\n--- END OF ${f.name} ---`)
      .join('\n\n');
      
     try {
        if (appState.projectId) {
            await updateProject(appState.projectId, { outlineJson: jsonOutline, audioSegments: [] });
        }
        
        // 1. Generate Summaries
        setAppState(prev => ({ ...prev, progressMessage: 'Generating summaries...' }));
        const outline: Outline = JSON.parse(jsonOutline);
        let previousSummary: string | null = null;
        const outlineWithSummaries: Outline = JSON.parse(JSON.stringify(outline)); // deep copy

        for (let i = 0; i < outlineWithSummaries.ideas.length; i++) {
            setAppState(prev => ({...prev, progressMessage: `Generating summary for idea ${i + 1} of ${outlineWithSummaries.ideas.length}...`}));
            const summary = await generateSummaryForIdea(outlineWithSummaries.ideas[i], originalText, previousSummary);
            outlineWithSummaries.ideas[i].summary = summary;
            previousSummary = summary;
        }
        const outlineWithSummariesJson = JSON.stringify(outlineWithSummaries, null, 2);
        
        setAppState(prev => ({ ...prev, progressMessage: 'Parsing and structuring summaries...', outlineWithSummariesJson }));
        const finalContentOutline = generateFinalContentJson(outlineWithSummaries);
        const finalContentJson = JSON.stringify(finalContentOutline, null, 2);


        if (appState.projectId) {
            await updateProject(appState.projectId, { outlineWithSummariesJson, finalContentJson });
        }
        setAppState(prev => ({ ...prev, finalContentJson }));

        // 2. Generate Script & Study Aids
        setAppState(prev => ({ ...prev, progressMessage: 'Generating script & study materials...' }));
        const scriptPromise = generateScript(finalContentJson)
            .then(rawScript => correctVoiceAlternation(rawScript));
        const studyAidsPromise = generateStudyAids(finalContentJson);

        const [script, studyMaterialsJson] = await Promise.all([scriptPromise, studyAidsPromise]);
        
        const segments = script.split(SCRIPT_SEPARATOR).map(s => s.trim()).filter(s => s.length > 0);
        
        if (appState.projectId) {
            await updateProject(appState.projectId, { fullScript: script, studyMaterialsJson });
        }
        setAppState(prev => ({ ...prev, fullScript: script, scriptSegments: segments, studyMaterialsJson }));
        
        // 3. Generate Audio
        const speaker1 = 'Voce 1';
        const speaker2 = 'Voce 2';
        const audioResults: string[] = [];
        for (let i = 0; i < segments.length; i++) {
            setAppState(prev => ({ ...prev, progressMessage: `Generating audio for segment ${i + 1} of ${segments.length}...` }));
            const audioData = await generateSpeech(segments[i], speaker1, speaker2);
            audioResults.push(audioData);
        }
        
        if (appState.projectId) {
            await updateProject(appState.projectId, { audioSegments: audioResults });
        }

        // 4. Go to final step
        setAppState(prev => ({
            ...prev,
            audioSegments: audioResults,
            isLoading: false,
            currentStep: 8,
            progressMessage: ''
        }));

     } catch (e) {
        const error = e instanceof Error ? e : new Error('An unknown error occurred');
        console.error(error);
        setAppState(prev => ({ ...prev, isLoading: false, currentStep: 2, error: `Automatic Generation Failed: ${error.message}` }));
     }
  };

  const goToStep = (step: number) => {
    setAppState(prev => ({...prev, currentStep: step, error: null}));
  }

  const handleStepClick = (step: number) => {
      // Only allow backward navigation to completed steps
      if (step < appState.currentStep) {
          if (step === 1) {
              goToStep(1);
          } else if (step === 2 && appState.outlineJson) {
              goToStep(2);
          } else if (step === 3 && appState.finalContentJson) {
              goToStep(3);
          } else if (step === 5 && appState.fullScript) {
              goToStep(5);
          } else if ((step === 7 || step === 8) && appState.audioSegments.length > 0) {
              goToStep(step);
          }
      }
  };
  
  const handleLoadProject = useCallback(async (id: number) => {
    try {
        const project = await getProject(id);
        if (!project) {
            throw new Error('Project not found');
        }

        let targetStep = 1;
        if (project.audioSegments && project.audioSegments.length > 0) {
            targetStep = 7;
        } else if (project.fullScript && project.studyMaterialsJson) {
            targetStep = 5;
        } else if (project.finalContentJson) {
            targetStep = 3;
        } else if (project.outlineJson) {
            targetStep = 2;
        }
        
        const scriptSegments = project.fullScript 
            ? project.fullScript.split(SCRIPT_SEPARATOR).map(s => s.trim()).filter(s => s.length > 0)
            : [];
            
        setAppState(prev => ({
            ...prev,
            currentStep: targetStep,
            projectId: project.id!,
            subject: project.subject,
            uploadedFiles: project.uploadedFiles,
            outlineJson: project.outlineJson ?? '',
            outlineWithSummariesJson: project.outlineWithSummariesJson ?? '',
            finalContentJson: project.finalContentJson ?? '',
            studyMaterialsJson: project.studyMaterialsJson ?? '',
            fullScript: project.fullScript,
            scriptSegments: scriptSegments,
            audioSegments: project.audioSegments,
            isLoading: false,
            error: null,
            progressMessage: '',
        }));

    } catch (e) {
        const error = e instanceof Error ? e : new Error('An unknown error occurred');
        setAppState(prev => ({...prev, error: `Failed to load project: ${error.message}`}));
    }
  }, []);
  

  const renderStep = () => {
    switch (appState.currentStep) {
      case 1:
        return <Step1Upload onProceed={handleFilesProceed} initialFiles={appState.uploadedFiles} isLoading={appState.isLoading} progressMessage={appState.progressMessage} onLoadProject={handleLoadProject} />;
      case 2:
        return <Step2Input onGenerate={handleSummaryGeneration} onGenerateFull={handleFullGeneration} isLoading={appState.isLoading} progressMessage={appState.progressMessage} inputText={appState.outlineJson} onGoBack={() => goToStep(1)} />;
      case 3:
        return <Step3Summaries 
                  finalContentJson={appState.finalContentJson}
                  outlineWithSummariesJson={appState.outlineWithSummariesJson}
                  subject={appState.subject}
                  onConfirm={handleContentGeneration} 
                  onGoBack={() => goToStep(2)} />;
      case 4:
         return <Step5Generate progressMessage={appState.progressMessage} />; // Generic loading screen for script & study aids
      case 5:
        return <Step4Script 
            script={appState.fullScript!} 
            studyMaterialsJson={appState.studyMaterialsJson}
            subject={appState.subject}
            onConfirm={handleAudioGeneration} 
            onGoBack={() => goToStep(3)} 
            />;
      case 6:
        return <Step5Generate progressMessage={appState.progressMessage} />; // Audio generation
      case 7:
        return <Step6Review audioSegments={appState.audioSegments} onConfirm={() => goToStep(8)} />;
      case 8:
        return <Step7Final audioSegments={appState.audioSegments} onRestart={handleReset} subject={appState.subject} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            AI Podcast & Study-Tool Generator
          </h1>
          <p className="mt-2 text-lg text-gray-400">Transform your text into a podcast and study materials in 8 easy steps.</p>
        </header>
        
        <main className="bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8">
          <Stepper 
            currentStep={appState.currentStep > 8 ? 8 : appState.currentStep}
            totalSteps={8}
            onStepClick={handleStepClick}
          />
          <div className="mt-8 min-h-[400px]">
            {appState.error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{appState.error}</span>
                 <button onClick={() => setAppState(prev => ({...prev, error: null}))} className="absolute top-0 bottom-0 right-0 px-4 py-3">
                  <span className="text-2xl">&times;</span>
                </button>
              </div>
            )}
            {renderStep()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
