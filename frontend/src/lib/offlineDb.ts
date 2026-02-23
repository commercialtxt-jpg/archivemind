/**
 * offlineDb.ts
 * IndexedDB wrapper for ArchiveMind offline persistence.
 * Stores: notes, entities, pendingChanges
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { NoteSummary, EntityWithStats } from '../types';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

type PendingChangeMethod = 'POST' | 'PUT' | 'DELETE';

export interface PendingChange {
  id: string;          // UUID of the change (not the resource)
  method: PendingChangeMethod;
  url: string;         // e.g. "/notes/abc-123"
  body: unknown;       // request body (null for DELETE)
  createdAt: string;   // ISO timestamp
}

interface ArchiveMindDB extends DBSchema {
  notes: {
    key: string;
    value: NoteSummary;
    indexes: { 'by-updated': string };
  };
  entities: {
    key: string;
    value: EntityWithStats;
    indexes: { 'by-type': string };
  };
  pendingChanges: {
    key: string;
    value: PendingChange;
    indexes: { 'by-created': string };
  };
}

// ---------------------------------------------------------------------------
// DB singleton
// ---------------------------------------------------------------------------

let _db: IDBPDatabase<ArchiveMindDB> | null = null;

async function getDb(): Promise<IDBPDatabase<ArchiveMindDB>> {
  if (_db) return _db;

  _db = await openDB<ArchiveMindDB>('archivemind', 1, {
    upgrade(db) {
      // notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-updated', 'updated_at');
      }

      // entities store
      if (!db.objectStoreNames.contains('entities')) {
        const entitiesStore = db.createObjectStore('entities', { keyPath: 'id' });
        entitiesStore.createIndex('by-type', 'entity_type');
      }

      // pendingChanges store
      if (!db.objectStoreNames.contains('pendingChanges')) {
        const pendingStore = db.createObjectStore('pendingChanges', { keyPath: 'id' });
        pendingStore.createIndex('by-created', 'createdAt');
      }
    },
  });

  return _db;
}

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function cacheNotes(notes: NoteSummary[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('notes', 'readwrite');
    await Promise.all(notes.map((note) => tx.store.put(note)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache notes:', err);
  }
}

export async function getCachedNotes(): Promise<NoteSummary[]> {
  try {
    const db = await getDb();
    return await db.getAllFromIndex('notes', 'by-updated');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached notes:', err);
    return [];
  }
}

export async function getCachedNote(id: string): Promise<NoteSummary | undefined> {
  try {
    const db = await getDb();
    return await db.get('notes', id);
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached note:', err);
    return undefined;
  }
}

export async function removeCachedNote(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('notes', id);
  } catch (err) {
    console.warn('[offlineDb] Failed to remove cached note:', err);
  }
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export async function cacheEntities(entities: EntityWithStats[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('entities', 'readwrite');
    await Promise.all(entities.map((entity) => tx.store.put(entity)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache entities:', err);
  }
}

export async function getCachedEntities(type?: string): Promise<EntityWithStats[]> {
  try {
    const db = await getDb();
    if (type) {
      return await db.getAllFromIndex('entities', 'by-type', type);
    }
    return await db.getAll('entities');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached entities:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Pending Changes
// ---------------------------------------------------------------------------

export async function enqueuePendingChange(change: PendingChange): Promise<void> {
  try {
    const db = await getDb();
    await db.put('pendingChanges', change);
  } catch (err) {
    console.warn('[offlineDb] Failed to enqueue pending change:', err);
  }
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  try {
    const db = await getDb();
    return await db.getAllFromIndex('pendingChanges', 'by-created');
  } catch (err) {
    console.warn('[offlineDb] Failed to get pending changes:', err);
    return [];
  }
}

export async function removePendingChange(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('pendingChanges', id);
  } catch (err) {
    console.warn('[offlineDb] Failed to remove pending change:', err);
  }
}

export async function clearPendingChanges(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear('pendingChanges');
  } catch (err) {
    console.warn('[offlineDb] Failed to clear pending changes:', err);
  }
}

export async function countPendingChanges(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count('pendingChanges');
  } catch (err) {
    console.warn('[offlineDb] Failed to count pending changes:', err);
    return 0;
  }
}
