
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getAllProjects, deleteProject, db } from '../services/db';
import { Project } from '../types';
import { Spinner } from './Spinner';

interface SavedProjectsProps {
    onLoadProject: (id: number) => void;
}

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
            const allProjects = await getAllProjects();
            // Dexie adds an `id` field, which we don't want to specify on import.
            const exportableProjects = allProjects.map(({ id, ...rest }) => rest);
            const jsonString = JSON.stringify(exportableProjects, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `podcast_projects_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
            const text = await file.text();
            const importedProjects: Omit<Project, 'id'>[] = JSON.parse(text);

            if (!Array.isArray(importedProjects)) {
                throw new Error("Invalid format: JSON file is not an array.");
            }
            // Add a date to createdAt if it's missing for backwards compatibility
            const projectsToImport = importedProjects.map(p => ({
                ...p,
                createdAt: p.createdAt ? new Date(p.createdAt) : new Date()
            }));

            await db.projects.bulkAdd(projectsToImport as Project[]);
            await fetchProjects(); // Refresh list
        } catch (e) {
            const err = e instanceof Error ? e : new Error('An unknown error occurred');
            setError(`Failed to import projects: ${err.message}`);
            console.error(err);
        } finally {
            setIsImporting(false);
            // Reset file input
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
                    {isImporting ? 'Importing...' : 'Import Projects (.json)'}
                </button>
                <input type="file" ref={importFileRef} onChange={handleImport} accept=".json" className="hidden" />
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
                    {isImporting ? 'Importing...' : 'Import Projects'}
                </button>
                <input type="file" ref={importFileRef} onChange={handleImport} accept=".json" className="hidden" />

                <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors text-sm inline-flex items-center justify-center gap-2 disabled:bg-gray-600"
                >
                    {isExporting ? <Spinner/> : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    )}
                    {isExporting ? 'Exporting...' : 'Export All'}
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
