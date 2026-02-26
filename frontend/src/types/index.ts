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
  tags?: string[];
  duration_seconds?: number | null;
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
  category: string | null;
  notes: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

export interface Routine {
  id: string;
  workspace_id: string;
  field_trip_id: string | null;
  name: string;
  icon: string;
  checklist: ChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  /** Top-level category: "entity" | "concept" | "location" */
  node_type: string;
  /** For entity nodes: "person" | "artifact" | "location". Empty for concepts. */
  entity_type: string;
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

export type View = 'journal' | 'graph' | 'map' | 'entities' | 'inventory' | 'routines' | 'settings';

// ---------------------------------------------------------------------------
// Plan & Usage
// ---------------------------------------------------------------------------

export type PlanTier = 'free' | 'pro' | 'team';

export interface PlanLimits {
  tier: PlanTier;
  map_loads: number;
  storage_bytes: number;
  notes: number;
  entities: number;
  media_uploads: number;
  ai_requests: number;
  workspaces: number;
  team_members: number;
  price_cents: number;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  workspace_id: string;
  period_start: string;
  map_loads: number;
  media_uploads: number;
  storage_bytes: number;
  notes_count: number;
  entities_count: number;
  ai_requests: number;
  updated_at: string;
}

export interface UsageResponse {
  plan: PlanTier;
  limits: PlanLimits;
  usage: UsageRecord;
  plan_started_at: string | null;
  plan_expires_at: string | null;
}

export interface MapLocation {
  id: string;
  name: string;
  /** "note" or "entity" */
  source_type: 'note' | 'entity';
  source_id: string;
  lat: number;
  lng: number;
  /** Set for note sources; null for entity sources */
  note_type: NoteType | null;
  note_count: number;
  location_name: string | null;
}
