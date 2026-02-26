/**
 * Mock data for ArchiveMind — used as fallback when the backend is not running.
 * All arrays are intentionally empty so the app starts clean.
 * Keep type exports and function signatures intact.
 */

import type {
  Note,
  NoteSummary,
  NoteCount,
  EntityWithStats,
  Concept,
  FieldTrip,
  InventoryItem,
  Media,
  SearchResults,
  ApiResponse,
} from '../types';

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export const MOCK_NOTES_FULL: Note[] = [];

// ---------------------------------------------------------------------------
// Note summaries (used for lists)
// ---------------------------------------------------------------------------

export const MOCK_NOTE_SUMMARIES: NoteSummary[] = [];

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const MOCK_ENTITIES: EntityWithStats[] = [];

// ---------------------------------------------------------------------------
// Entity topics
// ---------------------------------------------------------------------------

export const MOCK_ENTITY_TOPICS: Array<{ id: string; name: string; note_count: number }> = [];

// ---------------------------------------------------------------------------
// Connected notes (entity → notes with strength)
// ---------------------------------------------------------------------------

export interface ConnectedNote {
  id: string;
  title: string;
  via: string;
  strength: 1 | 2 | 3;
  note_type: string;
  icon: string;
}

export const MOCK_CONNECTED_NOTES: ConnectedNote[] = [];

// ---------------------------------------------------------------------------
// Field trips
// ---------------------------------------------------------------------------

export const MOCK_FIELD_TRIPS: FieldTrip[] = [];

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export const MOCK_CONCEPTS: Concept[] = [];

// ---------------------------------------------------------------------------
// Note counts
// ---------------------------------------------------------------------------

export const MOCK_NOTE_COUNTS: NoteCount = {
  total: 0,
  starred: 0,
  deleted: 0,
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const MOCK_INVENTORY: InventoryItem[] = [];

// ---------------------------------------------------------------------------
// Photos (mock media items for the PhotoStrip)
// ---------------------------------------------------------------------------

export const MOCK_PHOTOS: Media[] = [];

export const MOCK_PHOTOS_NOTE4: Media[] = [];

// ---------------------------------------------------------------------------
// Mock audio — empty placeholder (keeps type compatibility)
// ---------------------------------------------------------------------------

export const MOCK_AUDIO: Media | null = null;

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

export const MOCK_SEARCH_RESULTS: SearchResults = {
  notes: [],
  entities: [],
  concepts: [],
};

// ---------------------------------------------------------------------------
// Accessor functions
// ---------------------------------------------------------------------------

export interface MockNoteFilters {
  starred?: boolean | string;
  deleted?: boolean | string;
  field_trip_id?: string;
  concept_id?: string;
  entity_type?: string;
  note_type?: string;
  sort?: string;
  order?: string;
}

export function getMockNotes(_filters: MockNoteFilters = {}): ApiResponse<NoteSummary[]> {
  return {
    data: [],
    meta: { total: 0, page: 1, per_page: 50 },
  };
}

export function getMockNote(_id: string): Note | undefined {
  return undefined;
}

export function getMockNoteCounts(): NoteCount {
  return MOCK_NOTE_COUNTS;
}

export function getMockEntities(): ApiResponse<EntityWithStats[]> {
  return {
    data: [],
    meta: { total: 0 },
  };
}

export function getMockEntity(_id: string): EntityWithStats | undefined {
  return undefined;
}

export function getMockEntityTopics(
  _id: string
): Array<{ id: string; name: string; note_count: number }> {
  return [];
}

export function getMockEntityNotes(_id: string): NoteSummary[] {
  return [];
}

export function getMockFieldTrips(): FieldTrip[] {
  return [];
}

export function getMockConcepts(): Concept[] {
  return [];
}

export function getMockInventory(): ApiResponse<InventoryItem[]> {
  return { data: [] };
}

export function getMockPhotos(_noteId: string): Media[] {
  return [];
}

export function getMockConnectedNotes(): ConnectedNote[] {
  return [];
}

export function getMockEntityCounts(): { person: number; location: number; artifact: number } {
  return { person: 0, location: 0, artifact: 0 };
}

export function getMockInventoryAlerts(): { items: InventoryItem[]; count: number } {
  return { items: [], count: 0 };
}

export function getMockSearchResults(_query: string): SearchResults {
  return MOCK_SEARCH_RESULTS;
}
