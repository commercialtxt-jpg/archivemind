-- ArchiveMind Development Seed Data
-- Run: docker exec -i archivemind-db psql -U archivemind archivemind < backend/seed.sql

BEGIN;

-- Clean existing seed data so re-runs work idempotently
DELETE FROM stars WHERE user_id = 'a0000000-0000-0000-0000-000000000001';
DELETE FROM media WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001');
DELETE FROM note_tags WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001');
DELETE FROM note_concepts WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001');
DELETE FROM note_entities WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001');
DELETE FROM note_field_trips WHERE note_id IN (SELECT id FROM notes WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001');
DELETE FROM graph_edges WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM routines WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM inventory_items WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM notes WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM tags WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM entities WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM concepts WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM field_trips WHERE workspace_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM workspaces WHERE id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE email = 'researcher@archivemind.dev';

-- Create a test user (password: "password123")
INSERT INTO users (id, email, password_hash, display_name, avatar_initials)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'researcher@archivemind.dev',
  '$argon2id$v=19$m=19456,t=2,p=1$dGVzdHNhbHQxMjM0NTY3OA$q8grxznyox9ZpbGCtPAL359KPs8SKb8ry4z8P7Vtcyo',
  'AK',
  'AK'
) ON CONFLICT (email) DO NOTHING;

-- Create workspace
INSERT INTO workspaces (id, user_id, name)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Field Research'
) ON CONFLICT DO NOTHING;

-- ─── Field Trips ───
INSERT INTO field_trips (id, workspace_id, name, icon) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Kandy Highlands', '🌿'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Galle Coastal', '🌊'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Ella Caves Survey', '🏔'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Colombo Urban', '🌺')
ON CONFLICT DO NOTHING;

-- ─── Concepts ───
INSERT INTO concepts (id, workspace_id, name, icon, category) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Traditional Medicine', '🌿', 'Cultural'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Forest Ecology', '🎋', 'Environmental'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Ritual Practices', '🏺', 'Cultural')
ON CONFLICT DO NOTHING;

-- ─── Entities (Persons) ───
INSERT INTO entities (id, workspace_id, name, entity_type, role, avatar_initials) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Priya Ratnam', 'person', 'Ayurvedic Practitioner · Kandy', 'PR'),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Nimal Bandara', 'person', 'Fisherman · Galle', 'NB'),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Elder', 'person', 'Ceremony Elder · Ella', 'EL'),
  ('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Vendors', 'person', 'Market Vendors · Colombo', 'VN')
ON CONFLICT DO NOTHING;

-- ─── Entities (Locations) ───
INSERT INTO entities (id, workspace_id, name, entity_type, avatar_initials) VALUES
  ('e0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000001', 'Kandy Highlands', 'location', 'KH'),
  ('e0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000001', 'Galle Coastal', 'location', 'GC'),
  ('e0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000001', 'Ella Caves', 'location', 'EC'),
  ('e0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000001', 'Peradeniya', 'location', 'PE'),
  ('e0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000001', 'Colombo', 'location', 'CO')
ON CONFLICT DO NOTHING;

-- ─── Entities (Artifacts) ───
INSERT INTO entities (id, workspace_id, name, entity_type, role, avatar_initials) VALUES
  ('e0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000001', 'Sida rhombifolia', 'artifact', 'Medicinal Plant', 'SR')
ON CONFLICT DO NOTHING;

-- ─── Tags ───
INSERT INTO tags (id, workspace_id, name) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'medicine'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'ritual'),
  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'kandy'),
  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'coastal'),
  ('f0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'ecology'),
  ('f0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'ayurveda'),
  ('f0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'ella'),
  ('f0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'trade'),
  ('f0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 'markets')
ON CONFLICT DO NOTHING;

-- ─── Notes ───
INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, location_name, location_lat, location_lng, gps_coords, weather, temperature_c, time_start, time_end) VALUES
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Herbal Healer of Kandy Interview',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Meeting with Priya Ratnam, a third-generation Ayurvedic practitioner in the Kandy highlands. She described her process of gathering herbs from the surrounding forests, particularly Sida rhombifolia."}]},{"type":"paragraph","content":[{"type":"text","text":"The practice combines traditional knowledge passed down through her family with observations of forest ecology. She noted seasonal variations in plant potency and the importance of lunar cycles in harvesting."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Key Observations"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Herbs gathered at dawn show higher efficacy according to practitioner"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Forest paths are maintained by local community as shared resource"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cross-pollination of traditional and modern medical approaches"}]}]}]}]}',
   'Meeting with Priya Ratnam, a third-generation Ayurvedic practitioner in the Kandy highlands. She described her process of gathering herbs from the surrounding forests, particularly Sida rhombifolia. The practice combines traditional knowledge passed down through her family with observations of forest ecology. She noted seasonal variations in plant potency and the importance of lunar cycles in harvesting. Key Observations: Herbs gathered at dawn show higher efficacy according to practitioner. Forest paths are maintained by local community as shared resource. Cross-pollination of traditional and modern medical approaches.',
   'interview', 'Kandy Highlands', 7.2906, 80.6337, '7.2906°N, 80.6337°E', 'Partly Cloudy', 28,
   '2025-07-14T09:32:00Z', '2025-07-14T11:04:00Z'),

  ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Galle Coastal Plant Survey',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Coastal survey of plant species along the Galle shoreline. Documented several species adapted to salt spray conditions including Barringtonia asiatica and Calophyllum inophyllum."}]},{"type":"paragraph","content":[{"type":"text","text":"The fishermen, particularly Nimal Bandara, provided insights into how coastal vegetation changes have affected fish habitats over the past decade."}]}]}',
   'Coastal survey of plant species along the Galle shoreline. Documented several species adapted to salt spray conditions including Barringtonia asiatica and Calophyllum inophyllum. The fishermen, particularly Nimal Bandara, provided insights into how coastal vegetation changes have affected fish habitats over the past decade.',
   'field_note', 'Galle', 6.0535, 80.2210, '6.0535°N, 80.2210°E', 'Sunny', 31,
   '2025-07-13T07:15:00Z', '2025-07-13T12:30:00Z'),

  ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Voice Memo: Forest Trail',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Audio recording from the Peradeniya botanical garden trail. Captured ambient forest sounds and brief interview with a park botanist about conservation efforts."}]}]}',
   'Audio recording from the Peradeniya botanical garden trail. Captured ambient forest sounds and brief interview with a park botanist about conservation efforts.',
   'voice_memo', 'Peradeniya', 7.2722, 80.5953, '7.2722°N, 80.5953°E', 'Clear', 26,
   '2025-07-13T14:20:00Z', '2025-07-13T14:28:42Z'),

  ('10000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'Ritual Ceremony Documentation',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Photographic documentation of a traditional healing ceremony in the Ella caves region. The Elder presided over a ritual involving herbal preparations and chanting."}]},{"type":"paragraph","content":[{"type":"text","text":"The ceremony draws on both Buddhist and pre-Buddhist traditions, reflecting layers of cultural history in the region."}]}]}',
   'Photographic documentation of a traditional healing ceremony in the Ella caves region. The Elder presided over a ritual involving herbal preparations and chanting. The ceremony draws on both Buddhist and pre-Buddhist traditions, reflecting layers of cultural history in the region.',
   'photo', 'Ella', 6.8667, 81.0500, '6.8667°N, 81.0500°E', 'Overcast', 22,
   '2025-07-11T06:00:00Z', '2025-07-11T10:45:00Z'),

  ('10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'Market Vendor Conversations',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Interviews with market vendors in Colombo''s Pettah district about trade routes for traditional medicinal herbs. The vendors described supply chains connecting rural gatherers to urban distributors."}]},{"type":"paragraph","content":[{"type":"text","text":"Several vendors noted increasing demand for organic and traditionally-prepared herbs, driven by both local and international buyers."}]}]}',
   'Interviews with market vendors in Colombo''s Pettah district about trade routes for traditional medicinal herbs. The vendors described supply chains connecting rural gatherers to urban distributors. Several vendors noted increasing demand for organic and traditionally-prepared herbs, driven by both local and international buyers.',
   'interview', 'Colombo', 6.9271, 79.8612, '6.9271°N, 79.8612°E', 'Humid', 33,
   '2025-07-10T10:00:00Z', '2025-07-10T10:41:08Z')
ON CONFLICT DO NOTHING;

-- ─── Note-Field Trip Associations ───
INSERT INTO note_field_trips (note_id, field_trip_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ─── Note-Entity Associations ───
INSERT INTO note_entities (note_id, entity_id, mention_count) VALUES
  ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 5),
  ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000011', 3),
  ('10000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000021', 2),
  ('10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 4),
  ('10000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000012', 2),
  ('10000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000014', 1),
  ('10000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000003', 3),
  ('10000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000013', 2),
  ('10000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000004', 4),
  ('10000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000015', 2)
ON CONFLICT DO NOTHING;

-- ─── Note-Concept Associations ───
INSERT INTO note_concepts (note_id, concept_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ─── Note-Tag Associations ───
INSERT INTO note_tags (note_id, tag_id) VALUES
  ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000004'),
  ('10000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000005'),
  ('10000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000006'),
  ('10000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002'),
  ('10000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000007'),
  ('10000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000008'),
  ('10000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000009')
ON CONFLICT DO NOTHING;

-- ─── Inventory Items ───
INSERT INTO inventory_items (id, workspace_id, name, icon, status, sort_order) VALUES
  ('20000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Camera (Sony A7)', '📷', 'charged', 1),
  ('20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'External Mic', '🎙', 'ready', 2),
  ('20000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Powerbank', '🔋', 'low', 3),
  ('20000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'SD Cards (×3)', '💾', 'packed', 4),
  ('20000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Headphones', '🎧', 'missing', 5),
  ('20000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Field Notebook', '📓', 'packed', 6)
ON CONFLICT DO NOTHING;

-- ─── Routines ───
INSERT INTO routines (id, workspace_id, name, checklist, is_active) VALUES
  ('30000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Pre-Trip Equipment Check',
   '[{"label":"Charge all batteries","done":true},{"label":"Format SD cards","done":true},{"label":"Pack microphone","done":false},{"label":"Download offline maps","done":false},{"label":"Backup previous recordings","done":true}]',
   true),
  ('30000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Morning Field Protocol',
   '[{"label":"Check weather forecast","done":false},{"label":"Calibrate GPS","done":false},{"label":"Review interview questions","done":false},{"label":"Test audio levels","done":false}]',
   false)
ON CONFLICT DO NOTHING;

-- ─── Graph Edges ───
INSERT INTO graph_edges (workspace_id, source_type, source_id, target_type, target_id, edge_type, strength, label, is_dashed) VALUES
  -- Priya <-> Kandy Highlands
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000011', 'entity_location', 0.9, 'Based in', false),
  -- Priya <-> Traditional Medicine
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000001', 'concept', 'd0000000-0000-0000-0000-000000000001', 'entity_concept', 0.85, 'Practices', false),
  -- Priya <-> Sida rhombifolia
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000021', 'entity_co_mention', 0.7, 'Uses', false),
  -- Nimal <-> Galle Coastal
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000002', 'entity', 'e0000000-0000-0000-0000-000000000012', 'entity_location', 0.9, 'Based in', false),
  -- Nimal <-> Forest Ecology
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000002', 'concept', 'd0000000-0000-0000-0000-000000000002', 'entity_concept', 0.6, 'Observes', false),
  -- Elder <-> Ella Caves
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000003', 'entity', 'e0000000-0000-0000-0000-000000000013', 'entity_location', 0.8, 'Presides', false),
  -- Elder <-> Ritual Practices
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000003', 'concept', 'd0000000-0000-0000-0000-000000000003', 'entity_concept', 0.95, 'Leads', false),
  -- Traditional Medicine <-> Ritual Practices (concept-concept)
  ('b0000000-0000-0000-0000-000000000001', 'concept', 'd0000000-0000-0000-0000-000000000001', 'concept', 'd0000000-0000-0000-0000-000000000003', 'concept_concept', 0.65, 'Related to', false),
  -- Kandy <-> Galle (cross-region)
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000011', 'entity', 'e0000000-0000-0000-0000-000000000012', 'cross_region', 0.3, 'Trade route', true),
  -- Vendors <-> Colombo
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000004', 'entity', 'e0000000-0000-0000-0000-000000000015', 'entity_location', 0.85, 'Based in', false),
  -- Traditional Medicine <-> Forest Ecology
  ('b0000000-0000-0000-0000-000000000001', 'concept', 'd0000000-0000-0000-0000-000000000001', 'concept', 'd0000000-0000-0000-0000-000000000002', 'concept_concept', 0.5, 'Depends on', false),
  -- Peradeniya <-> Forest Ecology
  ('b0000000-0000-0000-0000-000000000001', 'entity', 'e0000000-0000-0000-0000-000000000014', 'concept', 'd0000000-0000-0000-0000-000000000002', 'location_concept', 0.7, 'Research site', false)
ON CONFLICT DO NOTHING;

-- ─── Media (Audio & Photos) ───
-- Audio for Kandy Interview (23:14 duration as shown in mockup)
INSERT INTO media (id, note_id, media_type, s3_key, original_filename, mime_type, file_size_bytes, duration_seconds, label, transcription_status, transcription_text, sort_order) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'audio',
   '/mock/audio/kandy-interview.webm', 'kandy-interview.webm', 'audio/webm', 18432000, 1394,
   'Interview Recording', 'completed', 'Priya Ratnam described the lunar harvesting cycles used for medicinal plants...', 0),
  -- Audio for Voice Memo: Forest Trail (8:42 duration)
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'audio',
   '/mock/audio/forest-trail.webm', 'forest-trail.webm', 'audio/webm', 5242880, 522,
   'Forest Trail Recording', 'completed', 'Audio recording from the Peradeniya botanical garden trail...', 0),
  -- Audio for Market Vendor (41:08 duration)
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'audio',
   '/mock/audio/market-vendors.webm', 'market-vendors.webm', 'audio/webm', 29360128, 2468,
   'Vendor Interviews', 'completed', 'Three vendors confirm the trade route for dried herbs...', 0)
ON CONFLICT DO NOTHING;

-- Photos for Kandy Interview (mockup shows Sida r., Clay mortar, Drying rack, Herb #7, +8 more)
INSERT INTO media (id, note_id, media_type, s3_key, original_filename, mime_type, label, sort_order) VALUES
  ('41000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Sida+r.', 'sida-rhombifolia.jpg', 'image/jpeg', 'Sida r.', 0),
  ('41000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Clay+mortar', 'clay-mortar.jpg', 'image/jpeg', 'Clay mortar', 1),
  ('41000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Drying+rack', 'drying-rack.jpg', 'image/jpeg', 'Drying rack', 2),
  ('41000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Herb+7', 'herb-7.jpg', 'image/jpeg', 'Herb #7', 3),
  ('41000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Herb+8', 'herb-8.jpg', 'image/jpeg', 'Herb #8', 4),
  ('41000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Garden+path', 'garden-path.jpg', 'image/jpeg', 'Garden path', 5),
  ('41000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Priya+garden', 'priya-garden.jpg', 'image/jpeg', 'Priya garden', 6),
  ('41000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Herb+press', 'herb-press.jpg', 'image/jpeg', 'Herb press', 7),
  ('41000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Kandy+view', 'kandy-view.jpg', 'image/jpeg', 'Kandy view', 8),
  ('41000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Highland+forest', 'highland-forest.jpg', 'image/jpeg', 'Highland forest', 9),
  ('41000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Root+sample', 'root-sample.jpg', 'image/jpeg', 'Root sample', 10),
  ('41000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Preparation', 'preparation.jpg', 'image/jpeg', 'Preparation', 11)
ON CONFLICT DO NOTHING;

-- Photos for Ritual Ceremony (mockup: 📸 47 photos, seed a handful as representative)
INSERT INTO media (id, note_id, media_type, s3_key, original_filename, mime_type, label, sort_order) VALUES
  ('42000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Ceremony+start', 'ceremony-1.jpg', 'image/jpeg', 'Ceremony start', 0),
  ('42000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Elder+chanting', 'ceremony-2.jpg', 'image/jpeg', 'Elder chanting', 1),
  ('42000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Herbal+prep', 'ceremony-3.jpg', 'image/jpeg', 'Herbal preparation', 2),
  ('42000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Cave+entrance', 'ceremony-4.jpg', 'image/jpeg', 'Cave entrance', 3),
  ('42000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Ritual+items', 'ceremony-5.jpg', 'image/jpeg', 'Ritual items', 4),
  ('42000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Offerings', 'ceremony-6.jpg', 'image/jpeg', 'Offerings', 5),
  ('42000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Incense', 'ceremony-7.jpg', 'image/jpeg', 'Incense', 6),
  ('42000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000004', 'photo',
   'https://placehold.co/200x180/E8DDD0/4A3F38?text=Final+blessing', 'ceremony-8.jpg', 'image/jpeg', 'Final blessing', 7)
ON CONFLICT DO NOTHING;

-- ─── Star a note ───
INSERT INTO stars (user_id, note_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

UPDATE notes SET is_starred = true WHERE id = '10000000-0000-0000-0000-000000000001';

COMMIT;
