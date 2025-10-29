
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Stepper } from './components/Stepper';
import { Step1Upload } from './components/Step1Upload';
import { Step2Input } from './components/Step2Input';
import { Step3Summaries } from './components/Step3Summaries';
import { Step4Script } from './components/Step4Script'; // This is now Step5ReviewContent
import { Step5Generate } from './components/Step5Generate';
import { Step6Review } from './components/Step6Review';
import { Step7Final } from './components/Step7Final';
import { PromptEditorModal } from './components/PromptEditorModal';
import { generateSpeech } from './services/geminiService';
import { generateOutline } from './services/outlineService';
import { generateScript } from './services/scriptService';
import { generateSummaryForIdea } from './services/summaryService';
import { generateStudyAids } from './services/studyAidsService';
import { generateFinalContentJson } from './services/markdownParser';
import { AppState, UploadedFile, Project, Outline } from './types';
import { SCRIPT_SEPARATOR } from './constants';
import { db, addProject, updateProject, getProject, deleteProject } from './services/db';


const SAVED_PROMPT_KEY = 'podcastGeneratorPrompt';

const defaultPromptFallback = `Sei un autore di script per podcast. Il tuo compito è trasformare il testo fornito in uno script per un podcast vivace e colloquiale tra due conduttori, "Voce 1" e "Voce 2".

**REGOLE FONDAMENTALI (da seguire con la massima precisione):**

1.  **Struttura:** Dividi lo script in esattamente 5 segmenti, separati da "--- SEGMENT ---".
2.  **Formato:** Usa solo testo semplice. Ogni riga di dialogo deve iniziare con "Voce 1: " o "Voce 2: ". Non usare **mai** markdown (\`*\`, \`**\`, ecc.).
3.  **Alternanza Voci:** **Questa è la regola più importante.** Le voci devono alternarsi rigorosamente. A "Voce 1" deve SEMPRE seguire "Voce 2", e viceversa. Non ci devono **mai** essere due battute consecutive della stessa voce, nemmeno tra la fine di un segmento e l'inizio del successivo.
4.  **Contenuto:** Non aggiungere introduzioni o conclusioni generali allo script. Mantieni un flusso di discorso continuo tra i segmenti.
5.  **Lingua:** Presta attenzione alla pronuncia corretta di parole complesse o straniere (es. noùmeno, epistéme).

**STILE E TONO (per rendere la conversazione naturale e coinvolgente):**

*   **Atteggiamento dei Conduttori:** I conduttori sono esperti dell'argomento, non stanno leggendo o riassumendo un testo. **Non devono MAI dire frasi come "il testo fornito dice" o "secondo questo articolo".** Devono discutere l'argomento (che sia un libro, una teoria, un evento) in modo naturale, come se la conoscenza fosse loro.
*   **Tono:** Deve essere energetico, entusiasta e informale. Usa un linguaggio accessibile e frasi colloquiali come "Insomma," "Voglio dire," "Sai,".
*   **Struttura del Dialogo:** Crea un botta e risposta dinamico. Alterna battute brevi e incisive a spiegazioni più lunghe. Usa frequenti interiezioni di assenso come "Esatto," "Certo," "Proprio così." per mantenere il flusso.
*   **Interazione:** Un conduttore può porre domande o esprimere un dubbio, permettendo all'altro di chiarire. Devono costruire l'uno sulle idee dell'altro, dando l'impressione di una vera collaborazione e convalidando i punti a vicenda ("Hai colto il punto", "Esattamente quello che pensavo").
*   **Tecniche di Coinvolgimento:** Usa domande retoriche per passare da un punto all'altro ("Affascinante, non trovi?"). Spiega concetti complessi con analogie semplici ("È un po' come se...").

**FLUSSO GENERALE:**

1.  Inizia introducendo l'idea centrale o una concezione comune sull'argomento.
2.  Sviluppa la discussione introducendo nuove informazioni o prospettive che approfondiscono o sfidano l'idea iniziale.
3.  Esplora le implicazioni e il contesto più ampio.
4.  Concludi ogni segmento in modo che si colleghi naturalmente al successivo, mantenendo alta la curiosità.

Ecco il testo da elaborare:`;


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
    scriptGenerationPrompt: '',
  });
  
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const defaultPromptRef = useRef<string>('');

  useEffect(() => {
    const loadInitialPrompt = async () => {
      let defaultPrompt = defaultPromptFallback;
      try {
        const response = await fetch('./prompt.md');
        if (response.ok) {
          defaultPrompt = await response.text();
        } else {
          console.warn('Could not fetch prompt.md, using fallback.');
        }
      } catch (error) {
        console.error('Error fetching prompt.md, using fallback.', error);
      }
      
      defaultPromptRef.current = defaultPrompt;

      let promptToSet = defaultPrompt;
      try {
        const savedPrompt = localStorage.getItem(SAVED_PROMPT_KEY);
        if (savedPrompt) {
          promptToSet = savedPrompt;
        }
      } catch (error) {
        console.error("Could not read from localStorage, using default prompt.", error);
      }

      setAppState(prev => ({ ...prev, scriptGenerationPrompt: promptToSet }));
    };

    loadInitialPrompt();
  }, []);

  const handleReset = () => {
    let promptToSet = defaultPromptRef.current;
    try {
        const savedPrompt = localStorage.getItem(SAVED_PROMPT_KEY);
        if (savedPrompt) {
            promptToSet = savedPrompt;
        }
    } catch (error) {
        console.error("Could not read from localStorage on reset", error);
    }
    setAppState({
      currentStep: 1,
      projectId: null,
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
      scriptGenerationPrompt: promptToSet,
    });
    setIsPromptModalOpen(false);
  };

  const handleUpdatePrompt = (newPrompt: string) => {
    try {
      localStorage.setItem(SAVED_PROMPT_KEY, newPrompt);
    } catch (error) {
      console.error("Could not save to localStorage", error);
    }
    setAppState(prev => ({ ...prev, scriptGenerationPrompt: newPrompt }));
    setIsPromptModalOpen(false);
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
    
    const originalText = appState.uploadedFiles
      .filter(f => f.selected)
      .map(f => `--- START OF ${f.name} ---\n\n${f.content}\n\n--- END OF ${f.name} ---`)
      .join('\n\n');
      
    try {
        setAppState(prev => ({...prev, progressMessage: 'Generating podcast script...'}));
        const scriptPromise = generateScript(finalContentJson, originalText, appState.scriptGenerationPrompt)
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
        const scriptPromise = generateScript(finalContentJson, originalText, appState.scriptGenerationPrompt)
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
            targetStep = 8;
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
        return <Step2Input onGenerate={handleSummaryGeneration} onGenerateFull={handleFullGeneration} isLoading={appState.isLoading} progressMessage={appState.progressMessage} onEditPrompt={() => setIsPromptModalOpen(true)} inputText={appState.outlineJson} onGoBack={() => goToStep(1)} />;
      case 3:
        return <Step3Summaries finalContentJson={appState.finalContentJson} onConfirm={handleContentGeneration} onGoBack={() => goToStep(2)} />;
      case 4:
         return <Step5Generate progressMessage={appState.progressMessage} />; // Generic loading screen for script & study aids
      case 5:
        return <Step4Script 
            script={appState.fullScript!} 
            studyMaterialsJson={appState.studyMaterialsJson}
            onConfirm={handleAudioGeneration} 
            onGoBack={() => goToStep(3)} 
            />;
      case 6:
        return <Step5Generate progressMessage={appState.progressMessage} />; // Audio generation
      case 7:
        return <Step6Review audioSegments={appState.audioSegments} onConfirm={() => goToStep(8)} />;
      case 8:
        return <Step7Final audioSegments={appState.audioSegments} onRestart={handleReset} />;
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
      <PromptEditorModal 
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        prompt={appState.scriptGenerationPrompt}
        onSave={handleUpdatePrompt}
      />
    </div>
  );
};

export default App;
