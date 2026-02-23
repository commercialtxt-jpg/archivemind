/**
 * Mock data for ArchiveMind — used as fallback when the backend is not running.
 * All IDs use a simple `mock-*` pattern for consistency across the frontend.
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

const MOCK_NOTE_BODY_HERBAL: Record<string, unknown> = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Priya Ratnam is a third-generation Ayurvedic practitioner working in the upper ',
        },
        {
          type: 'locationTag',
          attrs: { label: 'Kandy Highlands', id: 'mock-location-1' },
        },
        {
          type: 'text',
          text: ' district. She maintains a living herbal garden of over 200 species, harvested according to traditional lunar cycles taught by her grandmother.',
        },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: '"We harvest by the moon. The sap moves up when the moon is full, and the roots draw inward when she wanes. My grandmother knew 400 plants. I know 200. My daughter, perhaps 50. Each generation loses something."',
            },
          ],
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'During the session, ' },
        {
          type: 'entityMention',
          attrs: { label: 'Priya Ratnam', id: 'mock-entity-1' },
        },
        { type: 'text', text: ' described her collaboration with ' },
        {
          type: 'entityMention',
          attrs: { label: 'Nimal Bandara', id: 'mock-entity-2' },
        },
        { type: 'text', text: ', a botanist at Peradeniya, cataloguing medicinal plants from the ' },
        {
          type: 'locationTag',
          attrs: { label: 'Galle Coastal', id: 'mock-location-2' },
        },
        { type: 'text', text: ' lowlands. They cross-reference findings under the framework of ' },
        {
          type: 'conceptTag',
          attrs: { label: 'Traditional Medicine', id: 'mock-concept-1' },
        },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: 'Ritual Practices' }],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'The preparation of medicinal compounds involves recitation of specific mantras — Priya calls this "awakening the plant spirit." She demonstrated the preparation of a poultice using ',
        },
        { type: 'text', marks: [{ type: 'italic' }], text: 'Sida rhombifolia' },
        {
          type: 'text',
          text: ' (bala), crushing fresh leaves in a clay mortar while chanting Mantra Kalawa under her breath. The final compound is wrapped in banana leaf and applied within three hours of preparation.',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Priya emphasized that botanical knowledge is inseparable from ritual knowledge — removing the mantra from the process renders the medicine "inert in spirit, though active in chemistry."',
        },
      ],
    },
  ],
};

export const MOCK_NOTES_FULL: Note[] = [
  {
    id: 'mock-note-1',
    workspace_id: 'mock-workspace-1',
    title: 'Herbal Healer of Kandy Interview',
    body: MOCK_NOTE_BODY_HERBAL,
    body_text:
      'Priya Ratnam is a third-generation Ayurvedic practitioner working in the upper Kandy Highlands district. She maintains a living herbal garden of over 200 species, harvested according to traditional lunar cycles taught by her grandmother. "We harvest by the moon..."',
    note_type: 'interview',
    is_starred: true,
    location_name: 'Kandy',
    location_lat: 7.2906,
    location_lng: 80.6337,
    gps_coords: '7.2906°N, 80.6337°E',
    weather: 'Partly Cloudy · 26°C',
    temperature_c: 26,
    time_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    time_end: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'mock-note-2',
    workspace_id: 'mock-workspace-1',
    title: 'Galle Coastal Plant Survey',
    body: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Surveyed 6 coastal mangrove species along the Galle shoreline. Documented Rhizophora mucronata, Avicennia marina, and Bruguiera gymnorrhiza in highest density near the river mouth. Local fishermen report significant decline over the past decade due to coastal development.',
            },
          ],
        },
      ],
    },
    body_text:
      'Surveyed 6 coastal mangrove species along the Galle shoreline. Documented Rhizophora mucronata, Avicennia marina, and Bruguiera gymnorrhiza in highest density near the river mouth.',
    note_type: 'field_note',
    is_starred: false,
    location_name: 'Galle',
    location_lat: 6.0535,
    location_lng: 80.221,
    gps_coords: '6.0535°N, 80.2210°E',
    weather: 'Sunny · 29°C',
    temperature_c: 29,
    time_start: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    time_end: null,
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'mock-note-3',
    workspace_id: 'mock-workspace-1',
    title: 'Voice Memo: Forest Trail',
    body: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Walking the forest trail behind Peradeniya Botanical Gardens. Identified several medicinal species growing in the understorey. Heard what sounds like a Malabar trogon in the canopy — rare sighting this season. Air temperature noticeably cooler under the canopy by at least 5 degrees.',
            },
          ],
        },
      ],
    },
    body_text:
      'Walking the forest trail behind Peradeniya Botanical Gardens. Identified several medicinal species growing in the understorey.',
    note_type: 'voice_memo',
    is_starred: false,
    location_name: 'Peradeniya',
    location_lat: 7.2678,
    location_lng: 80.5942,
    gps_coords: null,
    weather: null,
    temperature_c: null,
    time_start: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    time_end: null,
    created_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'mock-note-4',
    workspace_id: 'mock-workspace-1',
    title: 'Ritual Ceremony Documentation',
    body: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Photographed a full bali ceremony at the Ella Caves site. The ceremony lasted approximately 4 hours, beginning at sunrise. Offerings included locally foraged plant materials arranged in specific geometric patterns.',
            },
          ],
        },
      ],
    },
    body_text:
      'Photographed a full bali ceremony at the Ella Caves site. The ceremony lasted approximately 4 hours, beginning at sunrise.',
    note_type: 'photo',
    is_starred: true,
    location_name: 'Ella',
    location_lat: 6.8667,
    location_lng: 81.0466,
    gps_coords: null,
    weather: 'Clear · 24°C',
    temperature_c: 24,
    time_start: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    time_end: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'mock-note-5',
    workspace_id: 'mock-workspace-1',
    title: 'Market Vendor Conversations',
    body: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Spoke with several vendors at the Pettah market in Colombo. Documented trading patterns of dried medicinal herbs, particularly cinnamon bark (Cinnamomum verum), which traders described as increasingly difficult to source from highland regions.',
            },
          ],
        },
      ],
    },
    body_text:
      'Spoke with several vendors at the Pettah market in Colombo. Documented trading patterns of dried medicinal herbs.',
    note_type: 'interview',
    is_starred: false,
    location_name: 'Colombo',
    location_lat: 6.9271,
    location_lng: 79.8612,
    gps_coords: null,
    weather: 'Overcast · 31°C',
    temperature_c: 31,
    time_start: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    time_end: null,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];

// ---------------------------------------------------------------------------
// Note summaries (used for lists)
// ---------------------------------------------------------------------------

const MOCK_NOTE_TAGS: Record<string, string[]> = {
  'mock-note-1': ['#medicine', '#ritual', '#ayurveda'],
  'mock-note-2': ['#botany', '#mangrove', '#coastal'],
  'mock-note-3': ['#ecology', '#birding'],
  'mock-note-4': ['#ritual', '#ceremony', '#photography'],
  'mock-note-5': ['#trade', '#cinnamon', '#market'],
};

const MOCK_NOTE_DURATIONS: Record<string, number | null> = {
  'mock-note-3': 1394, // 23:14
};

export const MOCK_NOTE_SUMMARIES: NoteSummary[] = MOCK_NOTES_FULL.map((n) => ({
  id: n.id,
  workspace_id: n.workspace_id,
  title: n.title,
  body_text: n.body_text,
  note_type: n.note_type,
  is_starred: n.is_starred,
  location_name: n.location_name,
  gps_coords: n.gps_coords,
  weather: n.weather,
  tags: MOCK_NOTE_TAGS[n.id],
  duration_seconds: MOCK_NOTE_DURATIONS[n.id] ?? null,
  created_at: n.created_at,
  updated_at: n.updated_at,
}));

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const MOCK_ENTITIES: EntityWithStats[] = [
  {
    id: 'mock-entity-1',
    workspace_id: 'mock-workspace-1',
    name: 'Priya Ratnam',
    entity_type: 'person',
    role: 'Ayurvedic Practitioner · Kandy',
    avatar_initials: 'PR',
    total_mentions: 7,
    session_count: 3,
    concept_count: 4,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-2',
    workspace_id: 'mock-workspace-1',
    name: 'Nimal Bandara',
    entity_type: 'person',
    role: 'Botanist · Peradeniya University',
    avatar_initials: 'NB',
    total_mentions: 3,
    session_count: 2,
    concept_count: 2,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-3',
    workspace_id: 'mock-workspace-1',
    name: 'Kandy Highland Market',
    entity_type: 'location',
    role: 'Herb Trading Hub · Central Province',
    avatar_initials: 'KH',
    total_mentions: 5,
    session_count: 2,
    concept_count: 3,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-4',
    workspace_id: 'mock-workspace-1',
    name: 'Amara Wickrama',
    entity_type: 'person',
    role: 'Herbalist · Galle District',
    avatar_initials: 'AW',
    total_mentions: 4,
    session_count: 2,
    concept_count: 3,
    created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-5',
    workspace_id: 'mock-workspace-1',
    name: 'Sunil Perera',
    entity_type: 'person',
    role: 'Fisherman Elder · Galle',
    avatar_initials: 'SP',
    total_mentions: 2,
    session_count: 1,
    concept_count: 1,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-6',
    workspace_id: 'mock-workspace-1',
    name: 'Kamini De Silva',
    entity_type: 'person',
    role: 'Market Vendor · Colombo',
    avatar_initials: 'KD',
    total_mentions: 3,
    session_count: 1,
    concept_count: 2,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-7',
    workspace_id: 'mock-workspace-1',
    name: 'Peradeniya Botanical Gardens',
    entity_type: 'location',
    role: 'Research Site · Central Province',
    avatar_initials: 'PB',
    total_mentions: 6,
    session_count: 4,
    concept_count: 5,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-8',
    workspace_id: 'mock-workspace-1',
    name: 'Ella Caves',
    entity_type: 'location',
    role: 'Ceremonial Site · Uva Province',
    avatar_initials: 'EC',
    total_mentions: 4,
    session_count: 2,
    concept_count: 3,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-9',
    workspace_id: 'mock-workspace-1',
    name: 'Pettah Market',
    entity_type: 'location',
    role: 'Trading Center · Colombo',
    avatar_initials: 'PM',
    total_mentions: 3,
    session_count: 1,
    concept_count: 2,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-10',
    workspace_id: 'mock-workspace-1',
    name: 'Clay Mortar (Kandy)',
    entity_type: 'artifact',
    role: 'Medicine Preparation Tool',
    avatar_initials: 'CM',
    total_mentions: 3,
    session_count: 2,
    concept_count: 2,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-11',
    workspace_id: 'mock-workspace-1',
    name: 'Bali Offering Set',
    entity_type: 'artifact',
    role: 'Ceremonial Objects · Ella',
    avatar_initials: 'BO',
    total_mentions: 2,
    session_count: 1,
    concept_count: 2,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-entity-12',
    workspace_id: 'mock-workspace-1',
    name: 'Dried Herb Bundle',
    entity_type: 'artifact',
    role: 'Trade Specimen · Pettah',
    avatar_initials: 'DH',
    total_mentions: 1,
    session_count: 1,
    concept_count: 1,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Entity topics
// ---------------------------------------------------------------------------

export const MOCK_ENTITY_TOPICS: Array<{ id: string; name: string; note_count: number }> = [
  { id: 'mock-topic-1', name: 'Traditional Medicine', note_count: 7 },
  { id: 'mock-topic-2', name: 'Lunar Harvesting', note_count: 4 },
  { id: 'mock-topic-3', name: 'Ritual Practice', note_count: 3 },
  { id: 'mock-topic-4', name: 'Sida rhombifolia', note_count: 2 },
  { id: 'mock-topic-5', name: 'Mantra Kalawa', note_count: 2 },
];

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

export const MOCK_CONNECTED_NOTES: ConnectedNote[] = [
  {
    id: 'mock-note-2',
    title: 'Galle Coastal Plant Survey',
    via: 'Traditional Medicine',
    strength: 3,
    note_type: 'field_note',
    icon: '📋',
  },
  {
    id: 'mock-note-4',
    title: 'Ritual Ceremony Documentation',
    via: 'Ritual Practices',
    strength: 2,
    note_type: 'photo',
    icon: '📷',
  },
  {
    id: 'mock-note-5',
    title: 'Market Vendor Conversations',
    via: 'Trade Routes',
    strength: 1,
    note_type: 'interview',
    icon: '🎙',
  },
];

// ---------------------------------------------------------------------------
// Field trips
// ---------------------------------------------------------------------------

export const MOCK_FIELD_TRIPS: FieldTrip[] = [
  {
    id: 'mock-ft-1',
    workspace_id: 'mock-workspace-1',
    name: 'Kandy Highlands',
    icon: '🌿',
    note_count: 18,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-ft-2',
    workspace_id: 'mock-workspace-1',
    name: 'Galle Coastal',
    icon: '🌊',
    note_count: 12,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-ft-3',
    workspace_id: 'mock-workspace-1',
    name: 'Ella Caves Survey',
    icon: '🪨',
    note_count: 9,
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-ft-4',
    workspace_id: 'mock-workspace-1',
    name: 'Colombo Urban',
    icon: '🏙',
    note_count: 8,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export const MOCK_CONCEPTS: Concept[] = [
  {
    id: 'mock-concept-1',
    workspace_id: 'mock-workspace-1',
    name: 'Traditional Medicine',
    category: 'Cultural',
    icon: '🌿',
    note_count: 11,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-concept-2',
    workspace_id: 'mock-workspace-1',
    name: 'Forest Ecology',
    category: 'Natural Science',
    icon: '🌲',
    note_count: 7,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mock-concept-3',
    workspace_id: 'mock-workspace-1',
    name: 'Ritual Practices',
    category: 'Anthropology',
    icon: '🔮',
    note_count: 6,
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Note counts
// ---------------------------------------------------------------------------

export const MOCK_NOTE_COUNTS: NoteCount = {
  total: 47,
  starred: 8,
  deleted: 0,
};

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const MOCK_INVENTORY: InventoryItem[] = [
  {
    id: 'mock-inv-1',
    workspace_id: 'mock-workspace-1',
    name: 'Camera (Sony A7)',
    icon: '📷',
    status: 'charged',
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inv-2',
    workspace_id: 'mock-workspace-1',
    name: 'External Mic',
    icon: '🎙',
    status: 'ready',
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inv-3',
    workspace_id: 'mock-workspace-1',
    name: 'Powerbank',
    icon: '🔋',
    status: 'low',
    sort_order: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inv-4',
    workspace_id: 'mock-workspace-1',
    name: 'SD Cards (×3)',
    icon: '💾',
    status: 'packed',
    sort_order: 4,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inv-5',
    workspace_id: 'mock-workspace-1',
    name: 'Headphones',
    icon: '🎧',
    status: 'missing',
    sort_order: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'mock-inv-6',
    workspace_id: 'mock-workspace-1',
    name: 'Field Notebook',
    icon: '📓',
    status: 'packed',
    sort_order: 6,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// ---------------------------------------------------------------------------
// Photos (mock media items for the PhotoStrip)
// ---------------------------------------------------------------------------

export const MOCK_PHOTOS: Media[] = [
  {
    id: 'mock-photo-1',
    note_id: 'mock-note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'sida-rhombifolia.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: 'Sida r.',
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-photo-2',
    note_id: 'mock-note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'clay-mortar.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: 'Clay mortar',
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-photo-3',
    note_id: 'mock-note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'drying-rack.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: 'Drying rack',
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-photo-4',
    note_id: 'mock-note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'herb-7.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: 'Herb #7',
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 4,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-photo-5',
    note_id: 'mock-note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'garden-view.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: 'Garden',
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 5,
    created_at: new Date().toISOString(),
  },
  {
    id: 'mock-photo-6',
    note_id: 'mock-note-1',
    media_type: 'photo',
    s3_key: '',
    original_filename: 'prep-table.jpg',
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: 'Prep table',
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 6,
    created_at: new Date().toISOString(),
  },
  // 8 more photos (will appear as +8 overflow)
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `mock-photo-extra-${i + 1}`,
    note_id: 'mock-note-1',
    media_type: 'photo' as const,
    s3_key: '',
    original_filename: `extra-${i + 1}.jpg`,
    mime_type: 'image/jpeg',
    file_size_bytes: null,
    duration_seconds: null,
    label: `Photo ${i + 7}`,
    transcription_status: 'none',
    transcription_text: null,
    sort_order: 7 + i,
    created_at: new Date().toISOString(),
  })),
];

// ---------------------------------------------------------------------------
// Mock audio item for the herbal healer note
// ---------------------------------------------------------------------------

export const MOCK_AUDIO: Media = {
  id: 'mock-audio-1',
  note_id: 'mock-note-1',
  media_type: 'audio',
  s3_key: '',
  original_filename: 'kandy-interview.mp3',
  mime_type: 'audio/mpeg',
  file_size_bytes: null,
  duration_seconds: 1394, // 23:14
  label: 'Kandy Interview Recording',
  transcription_status: 'completed',
  transcription_text: null,
  sort_order: 1,
  created_at: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Search results
// ---------------------------------------------------------------------------

export const MOCK_SEARCH_RESULTS: SearchResults = {
  notes: [
    {
      id: 'mock-note-1',
      title: 'Herbal Healer of Kandy Interview',
      note_type: 'interview',
      excerpt: 'Priya Ratnam is a third-generation Ayurvedic practitioner...',
      rank: 0.9,
    },
    {
      id: 'mock-note-2',
      title: 'Galle Coastal Plant Survey',
      note_type: 'field_note',
      excerpt: 'Surveyed 6 coastal mangrove species along the Galle shoreline...',
      rank: 0.7,
    },
  ],
  entities: [
    { id: 'mock-entity-1', name: 'Priya Ratnam', entity_type: 'person', role: 'Ayurvedic Practitioner · Kandy' },
  ],
  concepts: [{ id: 'mock-concept-1', name: 'Traditional Medicine', category: 'Cultural' }],
};

// ---------------------------------------------------------------------------
// Accessor functions
// ---------------------------------------------------------------------------

export function getMockNotes(): ApiResponse<NoteSummary[]> {
  return {
    data: MOCK_NOTE_SUMMARIES,
    meta: { total: MOCK_NOTE_SUMMARIES.length, page: 1, per_page: 50 },
  };
}

export function getMockNote(id: string): Note | undefined {
  return MOCK_NOTES_FULL.find((n) => n.id === id);
}

export function getMockNoteCounts(): NoteCount {
  return MOCK_NOTE_COUNTS;
}

export function getMockEntities(): ApiResponse<EntityWithStats[]> {
  return {
    data: MOCK_ENTITIES,
    meta: { total: MOCK_ENTITIES.length },
  };
}

export function getMockEntity(_id: string): EntityWithStats {
  return MOCK_ENTITIES[0];
}

export function getMockEntityTopics(
  _id: string
): Array<{ id: string; name: string; note_count: number }> {
  return MOCK_ENTITY_TOPICS;
}

export function getMockEntityNotes(_id: string): NoteSummary[] {
  return MOCK_NOTE_SUMMARIES.slice(0, 3);
}

export function getMockFieldTrips(): FieldTrip[] {
  return MOCK_FIELD_TRIPS;
}

export function getMockConcepts(): Concept[] {
  return MOCK_CONCEPTS;
}

export function getMockInventory(): ApiResponse<InventoryItem[]> {
  return { data: MOCK_INVENTORY };
}

export function getMockPhotos(_noteId: string): Media[] {
  return MOCK_PHOTOS;
}

export function getMockConnectedNotes(): ConnectedNote[] {
  return MOCK_CONNECTED_NOTES;
}

export function getMockEntityCounts(): { person: number; location: number; artifact: number } {
  return { person: 14, location: 23, artifact: 31 };
}

export function getMockInventoryAlerts(): { items: InventoryItem[]; count: number } {
  const alertStatuses = ['low', 'missing', 'needs_check'];
  const items = MOCK_INVENTORY.filter((i) => alertStatuses.includes(i.status));
  return { items, count: items.length };
}

export function getMockSearchResults(_query: string): SearchResults {
  return MOCK_SEARCH_RESULTS;
}
