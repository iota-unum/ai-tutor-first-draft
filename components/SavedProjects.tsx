import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllProjects, deleteProject, db } from '../services/db';
import { Project } from '../types';
import { Spinner } from './Spinner';
import JSZip from 'jszip';
import { decodeBase64, encodePcmToMp3Blob, blobToBase64 } from '../utils/audioUtils';

interface SavedProjectsProps {
    onLoadProject: (id: number) => void;
}

const createFolderName = (title: string): string => {
    return title.replace(/[\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').toLowerCase();
};

export const SavedProjects: React.FC<SavedProjectsProps> = ({ onLoadProject }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);

    const importFileRef = useRef<HTMLInputElement>(null);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const savedProjects = await getAllProjects();
            setProjects(savedProjects);
        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            setError(`Failed to load projects: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    
    const handleDelete = async (id: number) => {
        try {
            await deleteProject(id);
            await fetchProjects();
        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            setError(`Failed to delete project: ${err.message}`);
        }
    };
    
    const handleExport = async () => {
        if (projects.length === 0) {
            alert("No projects to export.");
            return;
        }
        setIsExporting(true);
        setError(null);
        try {
            const zip = new JSZip();
            const allProjects = await getAllProjects();

            for (const project of allProjects) {
                const folderName = createFolderName(project.subject || `project_${project.id}`);
                const projectFolder = zip.folder(folderName);
                if (!projectFolder) {
                  throw new Error(`Could not create folder for project ${project.subject}`);
                }
                
                // Deep copy the project to modify it for JSON export without affecting the original object
                const { id, ...projectDataForJson } = JSON.parse(JSON.stringify(project));


                if (project.audioSegments && project.audioSegments.length > 0) {
                    const audioFolder = projectFolder.folder('audio');
                    if (!audioFolder) {
                        throw new Error(`Could not create audio folder for project ${project.subject}`);
                    }
                    
                    const audioFilePaths: string[] = [];
                    
                    for (let i = 0; i < project.audioSegments.length; i++) {
                        const segmentBase64 = project.audioSegments[i];
                        const rawFileName = `segment_${i + 1}.b64`;
                        const mp3FileName = `segment_${i + 1}.mp3`;
                        
                        // Path relative to the project.json file
                        const relativeAudioPath = `audio/${rawFileName}`;
                        audioFilePaths.push(relativeAudioPath);
                        
                        // Store the raw base64 data for lossless re-import
                        audioFolder.file(rawFileName, segmentBase64);
                        
                        // Generate and store a user-friendly MP3 file
                        const pcmData = decodeBase64(segmentBase64);
                        const mp3Blob = encodePcmToMp3Blob(pcmData);
                        audioFolder.file(mp3FileName, mp3Blob);
                    }
                    
                    // Replace raw audio data with file paths in the JSON object
                    projectDataForJson.audioSegments = audioFilePaths;


                    // Also generate a combined MP3 for user convenience
                    const pcmChunks = project.audioSegments.map(decodeBase64);
                    const totalLength = pcmChunks.reduce((acc, chunk) => acc + chunk.length, 0);
                    const combinedPcm = new Uint8Array(totalLength);
                    let offset = 0;
                    for (const chunk of pcmChunks) {
                        combinedPcm.set(chunk, offset);
                        offset += chunk.length;
                    }
                    const combinedMp3Blob = encodePcmToMp3Blob(combinedPcm);
                    audioFolder.file('full_podcast.mp3', combinedMp3Blob);
                }
                
                // Create project.json with audio data replaced by file paths
                projectFolder.file('project.json', JSON.stringify(projectDataForJson, null, 2));
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `podcast_projects_backup_${new Date().toISOString().slice(0, 10)}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            setError(`Failed to export projects: ${err.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setError(null);

        try {
            const zip = await JSZip.loadAsync(file);
            const projectsToImport: Omit<Project, 'id'>[] = [];
            
            const projectJsonFiles = zip.file(/project\.json$/);

            for (const projectJsonFile of projectJsonFiles) {
                const projectJsonString = await projectJsonFile.async('string');
                const projectData = JSON.parse(projectJsonString);

                // Check if audioSegments exists and contains file paths (new format)
                if (
                    projectData.audioSegments &&
                    Array.isArray(projectData.audioSegments) &&
                    projectData.audioSegments.length > 0 &&
                    typeof projectData.audioSegments[0] === 'string' &&
                    projectData.audioSegments[0].endsWith('.b64')
                ) {
                    const loadedAudioSegments: string[] = [];
                    const basePath = projectJsonFile.name.substring(0, projectJsonFile.name.lastIndexOf('/') + 1);

                    for (const relativeAudioPath of projectData.audioSegments) {
                        const fullAudioPath = basePath + relativeAudioPath;
                        const audioFile = zip.file(fullAudioPath);
                        if (audioFile) {
                            const audioBase64 = await audioFile.async('string');
                            loadedAudioSegments.push(audioBase64);
                        } else {
                            throw new Error(`Audio file '${fullAudioPath}' listed in project.json was not found in the ZIP archive.`);
                        }
                    }
                    // Replace the file paths with the loaded base64 audio data
                    projectData.audioSegments = loadedAudioSegments;
                }
                // If the above condition is false, we assume it's the old format with embedded audio data,
                // and we don't need to do anything.

                const newProject: Omit<Project, 'id'> = {
                    ...projectData,
                    createdAt: projectData.createdAt ? new Date(projectData.createdAt) : new Date(),
                };
                
                projectsToImport.push(newProject);
            }

            if (projectsToImport.length > 0) {
                await db.projects.bulkAdd(projectsToImport as Project[]);
                await fetchProjects();
            } else {
                throw new Error("No valid 'project.json' files found in the zip archive.");
            }
        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            setError(`Failed to import projects: ${err.message}`);
            console.error(err);
        } finally {
            setIsImporting(false);
            if(importFileRef.current) {
                importFileRef.current.value = '';
            }
        }
    };
    
    const getProjectStatus = (project: Project): string => {
        if (project.audioSegments && project.audioSegments.length > 0) {
            return 'Completed';
        }
        if (project.fullScript) {
            return 'Script Generated';
        }
        if (project.finalContentJson) {
            return 'Summaries Generated';
        }
        if (project.outlineJson) {
            return 'Outline Generated';
        }
        return 'New';
    }

    if (isLoading) {
        return (
            <div className="w-full mt-8 text-center">
                <Spinner />
                <p className="text-gray-400 mt-2">Loading saved projects...</p>
            </div>
        );
    }
    
    if (error && !isLoading) {
        return (
            <div className="w-full mt-8 text-center bg-red-900/50 p-4 rounded-lg">
              <p className="font-bold text-red-300">An Error Occurred</p>
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={() => setError(null)} className="mt-2 text-xs text-gray-300 underline">Dismiss</button>
            </div>
        )
    }

    if (projects.length === 0) {
        return (
            <div className="w-full mt-10 text-center p-6 bg-gray-900 border border-gray-700 rounded-lg">
                <h3 className="text-lg font-medium text-gray-400">No Saved Projects Yet</h3>
                <p className="text-gray-500 mt-2">Create a new project, and it will appear here. You can import projects from a backup file.</p>
                <button 
                    onClick={() => importFileRef.current?.click()}
                    disabled={isImporting}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm inline-flex items-center gap-2 disabled:bg-gray-600"
                >
                    {isImporting ? <Spinner/> : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    )}
                    {isImporting ? 'Importing...' : 'Import Projects (.zip)'}
                </button>
                <input type="file" ref={importFileRef} onChange={handleImport} accept=".zip" className="hidden" />
            </div>
        )
    }

    return (
        <div className="w-full mt-10">
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-gray-600" />
                </div>
                <div className="relative flex justify-center">
                    <span className="bg-gray-800 px-3 text-lg font-medium text-gray-400">Saved Projects</span>
                </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
                 <button 
                    onClick={() => importFileRef.current?.click()}
                    disabled={isImporting}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm inline-flex items-center justify-center gap-2 disabled:bg-gray-600"
                >
                    {isImporting ? <Spinner/> : (
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                    )}
                    {isImporting ? 'Importing...' : 'Import Projects (.zip)'}
                </button>
                <input type="file" ref={importFileRef} onChange={handleImport} accept=".zip" className="hidden" />

                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm inline-flex items-center justify-center gap-2 disabled:bg-gray-600"
                >
                    {isExporting ? <Spinner/> : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    )}
                    {isExporting ? 'Exporting...' : 'Export All (.zip)'}
                </button>
            </div>

            <ul className="space-y-3 max-h-80 overflow-y-auto bg-gray-900 p-3 rounded-lg border border-gray-700">
                {projects.map(project => (
                    <li key={project.id} className="p-4 bg-gray-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-grow">
                            <h4 className="font-bold text-lg text-purple-300 truncate">{project.subject}</h4>
                            <div className="flex items-center text-sm text-gray-400 mt-1 space-x-4">
                                <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
                                <span className="font-semibold text-yellow-400">{getProjectStatus(project)}</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex items-center gap-2 w-full sm:w-auto">
                            <button 
                                onClick={() => onLoadProject(project.id!)}
                                className="w-1/2 sm:w-auto flex-grow bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                            >
                                Load
                            </button>
                             <button 
                                onClick={() => handleDelete(project.id!)}
                                className="w-1/2 sm:w-auto flex-grow bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};