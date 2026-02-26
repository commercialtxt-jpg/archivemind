/**
 * offlineDb.ts
 * IndexedDB wrapper for ArchiveMind offline persistence.
 * Stores: notes, entities, pendingChanges
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { NoteSummary, EntityWithStats, Concept, FieldTrip, InventoryItem, Routine, Media } from '../types';

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

export interface MediaBlob {
  id: string;            // unique ID for this blob entry
  noteId: string;        // note this media belongs to (may be offline-xxx)
  mediaType: 'photo' | 'audio';
  data: ArrayBuffer;     // raw file data
  filename: string;
  mimeType: string;
  createdAt: string;     // ISO timestamp
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
  concepts: {
    key: string;
    value: Concept;
  };
  fieldTrips: {
    key: string;
    value: FieldTrip;
  };
  inventory: {
    key: string;
    value: InventoryItem;
    indexes: { 'by-category': string };
  };
  routines: {
    key: string;
    value: Routine;
  };
  mediaMetadata: {
    key: string;
    value: Media;
    indexes: { 'by-note': string };
  };
  mediaBlobs: {
    key: string;
    value: MediaBlob;
    indexes: { 'by-note': string };
  };
}

// ---------------------------------------------------------------------------
// DB singleton
// ---------------------------------------------------------------------------

let _db: IDBPDatabase<ArchiveMindDB> | null = null;

async function getDb(): Promise<IDBPDatabase<ArchiveMindDB>> {
  if (_db) return _db;

  _db = await openDB<ArchiveMindDB>('archivemind', 3, {
    upgrade(db, oldVersion) {
      // Version 1 stores
      if (oldVersion < 1) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-updated', 'updated_at');

        const entitiesStore = db.createObjectStore('entities', { keyPath: 'id' });
        entitiesStore.createIndex('by-type', 'entity_type');

        const pendingStore = db.createObjectStore('pendingChanges', { keyPath: 'id' });
        pendingStore.createIndex('by-created', 'createdAt');
      }

      // Version 2 stores
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('concepts')) {
          db.createObjectStore('concepts', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('fieldTrips')) {
          db.createObjectStore('fieldTrips', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('inventory')) {
          const invStore = db.createObjectStore('inventory', { keyPath: 'id' });
          invStore.createIndex('by-category', 'category');
        }
        if (!db.objectStoreNames.contains('routines')) {
          db.createObjectStore('routines', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('mediaMetadata')) {
          const mediaStore = db.createObjectStore('mediaMetadata', { keyPath: 'id' });
          mediaStore.createIndex('by-note', 'note_id');
        }
      }

      // Version 3 stores
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('mediaBlobs')) {
          const blobStore = db.createObjectStore('mediaBlobs', { keyPath: 'id' });
          blobStore.createIndex('by-note', 'noteId');
        }
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

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export async function cacheConcepts(concepts: Concept[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('concepts', 'readwrite');
    await Promise.all(concepts.map((c) => tx.store.put(c)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache concepts:', err);
  }
}

export async function getCachedConcepts(): Promise<Concept[]> {
  try {
    const db = await getDb();
    return await db.getAll('concepts');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached concepts:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Field Trips
// ---------------------------------------------------------------------------

export async function cacheFieldTrips(trips: FieldTrip[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('fieldTrips', 'readwrite');
    await Promise.all(trips.map((ft) => tx.store.put(ft)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache field trips:', err);
  }
}

export async function getCachedFieldTrips(): Promise<FieldTrip[]> {
  try {
    const db = await getDb();
    return await db.getAll('fieldTrips');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached field trips:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function cacheInventory(items: InventoryItem[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('inventory', 'readwrite');
    await Promise.all(items.map((i) => tx.store.put(i)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache inventory:', err);
  }
}

export async function getCachedInventory(): Promise<InventoryItem[]> {
  try {
    const db = await getDb();
    return await db.getAll('inventory');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached inventory:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

export async function cacheRoutines(routines: Routine[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('routines', 'readwrite');
    await Promise.all(routines.map((r) => tx.store.put(r)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache routines:', err);
  }
}

export async function getCachedRoutines(): Promise<Routine[]> {
  try {
    const db = await getDb();
    return await db.getAll('routines');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached routines:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Media Metadata
// ---------------------------------------------------------------------------

export async function cacheMediaMetadata(media: Media[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction('mediaMetadata', 'readwrite');
    await Promise.all(media.map((m) => tx.store.put(m)));
    await tx.done;
  } catch (err) {
    console.warn('[offlineDb] Failed to cache media metadata:', err);
  }
}

export async function getCachedMediaMetadata(noteId?: string): Promise<Media[]> {
  try {
    const db = await getDb();
    if (noteId) {
      return await db.getAllFromIndex('mediaMetadata', 'by-note', noteId);
    }
    return await db.getAll('mediaMetadata');
  } catch (err) {
    console.warn('[offlineDb] Failed to get cached media metadata:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Media Blobs (raw file data for offline uploads)
// ---------------------------------------------------------------------------

export async function storeMediaBlob(blob: MediaBlob): Promise<void> {
  try {
    const db = await getDb();
    await db.put('mediaBlobs', blob);
  } catch (err) {
    console.warn('[offlineDb] Failed to store media blob:', err);
  }
}

export async function getMediaBlobsForNote(noteId: string): Promise<MediaBlob[]> {
  try {
    const db = await getDb();
    return await db.getAllFromIndex('mediaBlobs', 'by-note', noteId);
  } catch (err) {
    console.warn('[offlineDb] Failed to get media blobs for note:', err);
    return [];
  }
}

export async function getAllMediaBlobs(): Promise<MediaBlob[]> {
  try {
    const db = await getDb();
    return await db.getAll('mediaBlobs');
  } catch (err) {
    console.warn('[offlineDb] Failed to get all media blobs:', err);
    return [];
  }
}

export async function removeMediaBlob(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete('mediaBlobs', id);
  } catch (err) {
    console.warn('[offlineDb] Failed to remove media blob:', err);
  }
}

export async function countMediaBlobs(): Promise<number> {
  try {
    const db = await getDb();
    return await db.count('mediaBlobs');
  } catch (err) {
    console.warn('[offlineDb] Failed to count media blobs:', err);
    return 0;
  }
}
