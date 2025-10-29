import Dexie, { type Table } from 'dexie';
import { Project } from '../types';

// FIX: Refactored the Dexie database setup to use a typed instance instead of subclassing.
// This resolves a TypeScript error where the `version` method was not found on the subclass
// and aligns with modern Dexie patterns for better type safety.
export const db = new Dexie('PodcastGeneratorDB') as Dexie & {
  projects: Table<Project>;
};

db.version(1).stores({
  projects: '++id, subject, createdAt',
});

// Added version 2 to migrate from inputText to outlineJson
db.version(2).stores({
  projects: '++id, subject, createdAt', 
}).upgrade(tx => {
  // This migration script moves the data from the old `inputText` field (which stored the outline)
  // to the new `outlineJson` field and deletes the old field to clean up the schema.
  return tx.table('projects').toCollection().modify(project => {
    if ((project as any).inputText) {
      project.outlineJson = (project as any).inputText;
      delete (project as any).inputText;
    }
  });
});

// Added version 3 to handle the new `outlineWithSummariesJson` field.
db.version(3).stores({
  projects: '++id, subject, createdAt',
}).upgrade(tx => {
    // This empty upgrade block ensures that Dexie is aware of the new schema version
    // and correctly handles the new `outlineWithSummariesJson` property on the Project object,
    // even though it's not indexed.
});

// Added version 4 to handle the new `finalContentJson` field.
db.version(4).stores({
  projects: '++id, subject, createdAt',
}).upgrade(tx => {
    // This empty upgrade block ensures that Dexie is aware of the new schema version
    // and correctly handles the new `finalContentJson` property on the Project object.
});

// Added version 5 to handle the new `studyMaterialsJson` field.
db.version(5).stores({
  projects: '++id, subject, createdAt',
}).upgrade(tx => {
    // This empty upgrade block ensures that Dexie is aware of the new schema version
    // and correctly handles the new `studyMaterialsJson` property on the Project object.
});


export const addProject = async (project: Omit<Project, 'id'>): Promise<number> => {
    return await db.projects.add(project as Project);
};

export const updateProject = async (id: number, updates: Partial<Project>): Promise<number> => {
    return await db.projects.update(id, updates);
};

export const getProject = async (id: number): Promise<Project | undefined> => {
    return await db.projects.get(id);
}

export const getAllProjects = async (): Promise<Project[]> => {
    return await db.projects.orderBy('createdAt').reverse().toArray();
};

export const deleteProject = async (id: number): Promise<void> => {
    await db.projects.delete(id);
};