-- ArchiveMind Development Seed Data
-- Run: docker exec -i archivemind-db psql -U archivemind archivemind < backend/seed.sql

BEGIN;

-- Create a test user (password: "password123")
INSERT INTO users (id, email, password_hash, display_name, avatar_initials)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'researcher@archivemind.dev',
  '$argon2id$v=19$m=19456,t=2,p=1$dGVzdHNhbHQxMjM0NTY3OA$YfHdEzW8RW4jPt0XpxjY/RNLDkGJcOXCpZGvRFkVqEk',
  'AK',
  'AK'
) ON CONFLICT (email) DO NOTHING;

-- Create workspace
INSERT INTO workspaces (id, owner_id, name)
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
INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, location_name, location_lat, location_lng) VALUES
  ('10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Herbal Healer of Kandy Interview',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Meeting with Priya Ratnam, a third-generation Ayurvedic practitioner in the Kandy highlands. She described her process of gathering herbs from the surrounding forests, particularly Sida rhombifolia."}]},{"type":"paragraph","content":[{"type":"text","text":"The practice combines traditional knowledge passed down through her family with observations of forest ecology. She noted seasonal variations in plant potency and the importance of lunar cycles in harvesting."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Key Observations"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Herbs gathered at dawn show higher efficacy according to practitioner"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Forest paths are maintained by local community as shared resource"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cross-pollination of traditional and modern medical approaches"}]}]}]}]}',
   'Meeting with Priya Ratnam, a third-generation Ayurvedic practitioner in the Kandy highlands. She described her process of gathering herbs from the surrounding forests, particularly Sida rhombifolia. The practice combines traditional knowledge passed down through her family with observations of forest ecology. She noted seasonal variations in plant potency and the importance of lunar cycles in harvesting. Key Observations: Herbs gathered at dawn show higher efficacy according to practitioner. Forest paths are maintained by local community as shared resource. Cross-pollination of traditional and modern medical approaches.',
   'interview', 'Kandy', 7.2906, 80.6337),

  ('10000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001',
   'Galle Coastal Plant Survey',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Coastal survey of plant species along the Galle shoreline. Documented several species adapted to salt spray conditions including Barringtonia asiatica and Calophyllum inophyllum."}]},{"type":"paragraph","content":[{"type":"text","text":"The fishermen, particularly Nimal Bandara, provided insights into how coastal vegetation changes have affected fish habitats over the past decade."}]}]}',
   'Coastal survey of plant species along the Galle shoreline. Documented several species adapted to salt spray conditions including Barringtonia asiatica and Calophyllum inophyllum. The fishermen, particularly Nimal Bandara, provided insights into how coastal vegetation changes have affected fish habitats over the past decade.',
   'field_note', 'Galle', 6.0535, 80.2210),

  ('10000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001',
   'Voice Memo: Forest Trail',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Audio recording from the Peradeniya botanical garden trail. Captured ambient forest sounds and brief interview with a park botanist about conservation efforts."}]}]}',
   'Audio recording from the Peradeniya botanical garden trail. Captured ambient forest sounds and brief interview with a park botanist about conservation efforts.',
   'voice_memo', 'Peradeniya', 7.2722, 80.5953),

  ('10000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001',
   'Ritual Ceremony Documentation',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Photographic documentation of a traditional healing ceremony in the Ella caves region. The Elder presided over a ritual involving herbal preparations and chanting."}]},{"type":"paragraph","content":[{"type":"text","text":"The ceremony draws on both Buddhist and pre-Buddhist traditions, reflecting layers of cultural history in the region."}]}]}',
   'Photographic documentation of a traditional healing ceremony in the Ella caves region. The Elder presided over a ritual involving herbal preparations and chanting. The ceremony draws on both Buddhist and pre-Buddhist traditions, reflecting layers of cultural history in the region.',
   'photo', 'Ella', 6.8667, 81.0500),

  ('10000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001',
   'Market Vendor Conversations',
   '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Interviews with market vendors in Colombo''s Pettah district about trade routes for traditional medicinal herbs. The vendors described supply chains connecting rural gatherers to urban distributors."}]},{"type":"paragraph","content":[{"type":"text","text":"Several vendors noted increasing demand for organic and traditionally-prepared herbs, driven by both local and international buyers."}]}]}',
   'Interviews with market vendors in Colombo''s Pettah district about trade routes for traditional medicinal herbs. The vendors described supply chains connecting rural gatherers to urban distributors. Several vendors noted increasing demand for organic and traditionally-prepared herbs, driven by both local and international buyers.',
   'interview', 'Colombo', 6.9271, 79.8612)
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

-- ─── Star a note ───
INSERT INTO stars (user_id, note_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001'
) ON CONFLICT DO NOTHING;

UPDATE notes SET is_starred = true WHERE id = '10000000-0000-0000-0000-000000000001';

COMMIT;
