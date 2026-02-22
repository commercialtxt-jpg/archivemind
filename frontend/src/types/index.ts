export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_initials: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Note {
  id: string;
  workspace_id: string;
  title: string;
  body: Record<string, unknown>;
  body_text: string;
  note_type: NoteType;
  is_starred: boolean;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  gps_coords: string | null;
  weather: string | null;
  temperature_c: number | null;
  time_start: string | null;
  time_end: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type NoteType = 'interview' | 'field_note' | 'voice_memo' | 'photo';

export interface NoteSummary {
  id: string;
  workspace_id: string;
  title: string;
  body_text: string;
  note_type: NoteType;
  is_starred: boolean;
  location_name: string | null;
  gps_coords: string | null;
  weather: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteCount {
  total: number;
  starred: number;
  deleted: number;
}

export interface Entity {
  id: string;
  workspace_id: string;
  name: string;
  entity_type: EntityType;
  role: string | null;
  avatar_initials: string;
  created_at: string;
  updated_at: string;
}

export type EntityType = 'person' | 'location' | 'artifact';

export interface EntityWithStats extends Entity {
  total_mentions: number;
  session_count: number;
  concept_count: number;
}

export interface Concept {
  id: string;
  workspace_id: string;
  name: string;
  category: string | null;
  icon: string;
  created_at: string;
  updated_at: string;
  note_count: number;
}

export interface FieldTrip {
  id: string;
  workspace_id: string;
  name: string;
  icon: string;
  created_at: string;
  updated_at: string;
  note_count: number;
}

export interface Tag {
  id: string;
  name: string;
  note_count: number;
}

export interface Media {
  id: string;
  note_id: string;
  media_type: 'audio' | 'photo' | 'video';
  s3_key: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  label: string | null;
  transcription_status: string;
  transcription_text: string | null;
  sort_order: number;
  created_at: string;
}

export interface SearchResults {
  notes: Array<{
    id: string;
    title: string;
    note_type: NoteType;
    excerpt: string;
    rank: number;
  }>;
  entities: Array<{
    id: string;
    name: string;
    entity_type: EntityType;
    role: string | null;
  }>;
  concepts: Array<{
    id: string;
    name: string;
    category: string | null;
  }>;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page?: number;
    per_page?: number;
  };
}

export interface InventoryItem {
  id: string;
  workspace_id: string;
  name: string;
  icon: string;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Routine {
  id: string;
  workspace_id: string;
  name: string;
  checklist: Array<{ label?: string; done?: boolean }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: 'person' | 'location' | 'artifact' | 'concept';
  note_count: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  edge_type: string;
  strength: number;
  label: string | null;
  is_dashed: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type View = 'journal' | 'graph' | 'map' | 'entities' | 'inventory' | 'routines';
