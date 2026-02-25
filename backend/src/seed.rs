use sqlx::PgPool;
use uuid::Uuid;

/// Seeds a fresh demo workspace for a newly registered user.
/// Inserts in FK order so no constraint violations occur.
/// This is intentionally non-fatal — caller logs a warning on failure.
pub async fn seed_demo_workspace(
    pool: &PgPool,
    user_id: Uuid,
    workspace_id: Uuid,
) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin().await?;

    // ─── Field Trips ───────────────────────────────────────────────────────────
    let ft_kandy = Uuid::new_v4();
    let ft_galle = Uuid::new_v4();
    let ft_ella = Uuid::new_v4();
    let ft_colombo = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO field_trips (id, workspace_id, name, icon) VALUES
         ($1,$5,$6,$7),
         ($2,$5,$8,$9),
         ($3,$5,$10,$11),
         ($4,$5,$12,$13)",
    )
    .bind(ft_kandy)
    .bind(ft_galle)
    .bind(ft_ella)
    .bind(ft_colombo)
    .bind(workspace_id)
    .bind("Kandy Highlands")
    .bind("🌿")
    .bind("Galle Coastal")
    .bind("🌊")
    .bind("Ella Caves Survey")
    .bind("🏔")
    .bind("Colombo Urban")
    .bind("🌺")
    .execute(&mut *tx)
    .await?;

    // ─── Concepts ──────────────────────────────────────────────────────────────
    let con_medicine = Uuid::new_v4();
    let con_ecology = Uuid::new_v4();
    let con_ritual = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO concepts (id, workspace_id, name, icon, category) VALUES
         ($1,$4,$5,$6,$7),
         ($2,$4,$8,$9,$10),
         ($3,$4,$11,$12,$13)",
    )
    .bind(con_medicine)
    .bind(con_ecology)
    .bind(con_ritual)
    .bind(workspace_id)
    .bind("Traditional Medicine")
    .bind("🌿")
    .bind("Cultural")
    .bind("Forest Ecology")
    .bind("🎋")
    .bind("Environmental")
    .bind("Ritual Practices")
    .bind("🏺")
    .bind("Cultural")
    .execute(&mut *tx)
    .await?;

    // ─── Entities (persons) ────────────────────────────────────────────────────
    let ent_priya = Uuid::new_v4();
    let ent_nimal = Uuid::new_v4();
    let ent_elder = Uuid::new_v4();
    let ent_vendors = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO entities (id, workspace_id, name, entity_type, role, avatar_initials) VALUES
         ($1,$5,'Priya Ratnam','person','Ayurvedic Practitioner · Kandy','PR'),
         ($2,$5,'Nimal Bandara','person','Fisherman · Galle','NB'),
         ($3,$5,'Elder','person','Ceremony Elder · Ella','EL'),
         ($4,$5,'Vendors','person','Market Vendors · Colombo','VN')",
    )
    .bind(ent_priya)
    .bind(ent_nimal)
    .bind(ent_elder)
    .bind(ent_vendors)
    .bind(workspace_id)
    .execute(&mut *tx)
    .await?;

    // ─── Entities (locations) ──────────────────────────────────────────────────
    let ent_loc_kandy = Uuid::new_v4();
    let ent_loc_galle = Uuid::new_v4();
    let ent_loc_ella = Uuid::new_v4();
    let ent_loc_peradeniya = Uuid::new_v4();
    let ent_loc_colombo = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO entities (id, workspace_id, name, entity_type, avatar_initials) VALUES
         ($1,$6,'Kandy Highlands','location','KH'),
         ($2,$6,'Galle Coastal','location','GC'),
         ($3,$6,'Ella Caves','location','EC'),
         ($4,$6,'Peradeniya','location','PE'),
         ($5,$6,'Colombo','location','CO')",
    )
    .bind(ent_loc_kandy)
    .bind(ent_loc_galle)
    .bind(ent_loc_ella)
    .bind(ent_loc_peradeniya)
    .bind(ent_loc_colombo)
    .bind(workspace_id)
    .execute(&mut *tx)
    .await?;

    // ─── Entities (artifacts) ──────────────────────────────────────────────────
    let ent_sida = Uuid::new_v4();

    sqlx::query(
        "INSERT INTO entities (id, workspace_id, name, entity_type, role, avatar_initials) VALUES
         ($1,$2,'Sida rhombifolia','artifact','Medicinal Plant','SR')",
    )
    .bind(ent_sida)
    .bind(workspace_id)
    .execute(&mut *tx)
    .await?;

    // ─── Tags ──────────────────────────────────────────────────────────────────
    let tag_medicine = Uuid::new_v4();
    let tag_ritual = Uuid::new_v4();
    let tag_kandy = Uuid::new_v4();
    let tag_coastal = Uuid::new_v4();
    let tag_ecology = Uuid::new_v4();
    let tag_ayurveda = Uuid::new_v4();
    let tag_ella = Uuid::new_v4();
    let tag_trade = Uuid::new_v4();
    let tag_markets = Uuid::new_v4();

    // Insert tags one at a time to keep things clear
    for (id, name) in [
        (tag_medicine, "medicine"),
        (tag_ritual, "ritual"),
        (tag_kandy, "kandy"),
        (tag_coastal, "coastal"),
        (tag_ecology, "ecology"),
        (tag_ayurveda, "ayurveda"),
        (tag_ella, "ella"),
        (tag_trade, "trade"),
        (tag_markets, "markets"),
    ] {
        sqlx::query(
            "INSERT INTO tags (id, workspace_id, name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        )
        .bind(id)
        .bind(workspace_id)
        .bind(name)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Notes ─────────────────────────────────────────────────────────────────
    let note1 = Uuid::new_v4();
    let note2 = Uuid::new_v4();
    let note3 = Uuid::new_v4();
    let note4 = Uuid::new_v4();
    let note5 = Uuid::new_v4();

    // Note 1 — Herbal Healer of Kandy Interview
    let body1 = serde_json::json!({
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Meeting with Priya Ratnam, a third-generation Ayurvedic practitioner in the Kandy highlands. She described her process of gathering herbs from the surrounding forests, particularly Sida rhombifolia."}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "The practice combines traditional knowledge passed down through her family with observations of forest ecology. She noted seasonal variations in plant potency and the importance of lunar cycles in harvesting."}]
            },
            {
                "type": "heading",
                "attrs": {"level": 2},
                "content": [{"type": "text", "text": "Key Observations"}]
            },
            {
                "type": "bulletList",
                "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Herbs gathered at dawn show higher efficacy according to practitioner"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Forest paths are maintained by local community as shared resource"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Cross-pollination of traditional and modern medical approaches"}]}]}
                ]
            }
        ]
    });
    let body_text1 = "Meeting with Priya Ratnam, a third-generation Ayurvedic practitioner in the Kandy highlands. She described her process of gathering herbs from the surrounding forests, particularly Sida rhombifolia. The practice combines traditional knowledge passed down through her family with observations of forest ecology. She noted seasonal variations in plant potency and the importance of lunar cycles in harvesting. Key Observations: Herbs gathered at dawn show higher efficacy according to practitioner. Forest paths are maintained by local community as shared resource. Cross-pollination of traditional and modern medical approaches.";

    sqlx::query(
        "INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end, is_starred) \
         VALUES ($1,$2,$3,$4,$5,$6::note_type,$7,$8,$9,$10,$11,$12,$13,$14,true)",
    )
    .bind(note1)
    .bind(workspace_id)
    .bind("Herbal Healer of Kandy Interview")
    .bind(&body1)
    .bind(body_text1)
    .bind("interview")
    .bind("Kandy Highlands")
    .bind(7.2906_f64)
    .bind(80.6337_f64)
    .bind("7.2906°N, 80.6337°E")
    .bind("Partly Cloudy")
    .bind(28_i32)
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-14T09:32:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-14T11:04:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .execute(&mut *tx)
    .await?;

    // Note 2 — Galle Coastal Plant Survey
    let body2 = serde_json::json!({
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Coastal survey of plant species along the Galle shoreline. Documented several species adapted to salt spray conditions including Barringtonia asiatica and Calophyllum inophyllum."}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "The fishermen, particularly Nimal Bandara, provided insights into how coastal vegetation changes have affected fish habitats over the past decade."}]
            }
        ]
    });
    let body_text2 = "Coastal survey of plant species along the Galle shoreline. Documented several species adapted to salt spray conditions including Barringtonia asiatica and Calophyllum inophyllum. The fishermen, particularly Nimal Bandara, provided insights into how coastal vegetation changes have affected fish habitats over the past decade.";

    sqlx::query(
        "INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end) \
         VALUES ($1,$2,$3,$4,$5,$6::note_type,$7,$8,$9,$10,$11,$12,$13,$14)",
    )
    .bind(note2)
    .bind(workspace_id)
    .bind("Galle Coastal Plant Survey")
    .bind(&body2)
    .bind(body_text2)
    .bind("field_note")
    .bind("Galle")
    .bind(6.0535_f64)
    .bind(80.2210_f64)
    .bind("6.0535°N, 80.2210°E")
    .bind("Sunny")
    .bind(31_i32)
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-13T07:15:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-13T12:30:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .execute(&mut *tx)
    .await?;

    // Note 3 — Voice Memo: Forest Trail
    let body3 = serde_json::json!({
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Audio recording from the Peradeniya botanical garden trail. Captured ambient forest sounds and brief interview with a park botanist about conservation efforts."}]
            }
        ]
    });
    let body_text3 = "Audio recording from the Peradeniya botanical garden trail. Captured ambient forest sounds and brief interview with a park botanist about conservation efforts.";

    sqlx::query(
        "INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end) \
         VALUES ($1,$2,$3,$4,$5,$6::note_type,$7,$8,$9,$10,$11,$12,$13,$14)",
    )
    .bind(note3)
    .bind(workspace_id)
    .bind("Voice Memo: Forest Trail")
    .bind(&body3)
    .bind(body_text3)
    .bind("voice_memo")
    .bind("Peradeniya")
    .bind(7.2722_f64)
    .bind(80.5953_f64)
    .bind("7.2722°N, 80.5953°E")
    .bind("Clear")
    .bind(26_i32)
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-13T14:20:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-13T14:28:42Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .execute(&mut *tx)
    .await?;

    // Note 4 — Ritual Ceremony Documentation
    let body4 = serde_json::json!({
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Photographic documentation of a traditional healing ceremony in the Ella caves region. The Elder presided over a ritual involving herbal preparations and chanting."}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "The ceremony draws on both Buddhist and pre-Buddhist traditions, reflecting layers of cultural history in the region."}]
            }
        ]
    });
    let body_text4 = "Photographic documentation of a traditional healing ceremony in the Ella caves region. The Elder presided over a ritual involving herbal preparations and chanting. The ceremony draws on both Buddhist and pre-Buddhist traditions, reflecting layers of cultural history in the region.";

    sqlx::query(
        "INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end) \
         VALUES ($1,$2,$3,$4,$5,$6::note_type,$7,$8,$9,$10,$11,$12,$13,$14)",
    )
    .bind(note4)
    .bind(workspace_id)
    .bind("Ritual Ceremony Documentation")
    .bind(&body4)
    .bind(body_text4)
    .bind("photo")
    .bind("Ella")
    .bind(6.8667_f64)
    .bind(81.0500_f64)
    .bind("6.8667°N, 81.0500°E")
    .bind("Overcast")
    .bind(22_i32)
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-11T06:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-11T10:45:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .execute(&mut *tx)
    .await?;

    // Note 5 — Market Vendor Conversations
    let body5 = serde_json::json!({
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Interviews with market vendors in Colombo's Pettah district about trade routes for traditional medicinal herbs. The vendors described supply chains connecting rural gatherers to urban distributors."}]
            },
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Several vendors noted increasing demand for organic and traditionally-prepared herbs, driven by both local and international buyers."}]
            }
        ]
    });
    let body_text5 = "Interviews with market vendors in Colombo's Pettah district about trade routes for traditional medicinal herbs. The vendors described supply chains connecting rural gatherers to urban distributors. Several vendors noted increasing demand for organic and traditionally-prepared herbs, driven by both local and international buyers.";

    sqlx::query(
        "INSERT INTO notes (id, workspace_id, title, body, body_text, note_type, \
         location_name, location_lat, location_lng, gps_coords, weather, temperature_c, \
         time_start, time_end) \
         VALUES ($1,$2,$3,$4,$5,$6::note_type,$7,$8,$9,$10,$11,$12,$13,$14)",
    )
    .bind(note5)
    .bind(workspace_id)
    .bind("Market Vendor Conversations")
    .bind(&body5)
    .bind(body_text5)
    .bind("interview")
    .bind("Colombo")
    .bind(6.9271_f64)
    .bind(79.8612_f64)
    .bind("6.9271°N, 79.8612°E")
    .bind("Humid")
    .bind(33_i32)
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-10T10:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .bind(
        chrono::DateTime::parse_from_rfc3339("2025-07-10T10:41:08Z")
            .unwrap()
            .with_timezone(&chrono::Utc),
    )
    .execute(&mut *tx)
    .await?;

    // Star note 1 in the stars audit table
    sqlx::query("INSERT INTO stars (user_id, note_id) VALUES ($1, $2) ON CONFLICT DO NOTHING")
        .bind(user_id)
        .bind(note1)
        .execute(&mut *tx)
        .await?;

    // ─── Note-Field Trip Associations ──────────────────────────────────────────
    for (note_id, ft_id) in [
        (note1, ft_kandy),
        (note2, ft_galle),
        (note3, ft_kandy),
        (note4, ft_ella),
        (note5, ft_colombo),
    ] {
        sqlx::query(
            "INSERT INTO note_field_trips (note_id, field_trip_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(note_id)
        .bind(ft_id)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Note-Entity Associations ──────────────────────────────────────────────
    for (note_id, entity_id, mention_count) in [
        (note1, ent_priya, 5i32),
        (note1, ent_loc_kandy, 3),
        (note1, ent_sida, 2),
        (note2, ent_nimal, 4),
        (note2, ent_loc_galle, 2),
        (note3, ent_loc_peradeniya, 1),
        (note4, ent_elder, 3),
        (note4, ent_loc_ella, 2),
        (note5, ent_vendors, 4),
        (note5, ent_loc_colombo, 2),
    ] {
        sqlx::query(
            "INSERT INTO note_entities (note_id, entity_id, mention_count) \
             VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        )
        .bind(note_id)
        .bind(entity_id)
        .bind(mention_count)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Note-Concept Associations ─────────────────────────────────────────────
    for (note_id, concept_id) in [
        (note1, con_medicine),
        (note1, con_ritual),
        (note2, con_ecology),
        (note3, con_medicine),
        (note4, con_ritual),
        (note5, con_medicine),
    ] {
        sqlx::query(
            "INSERT INTO note_concepts (note_id, concept_id) VALUES ($1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(note_id)
        .bind(concept_id)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Note-Tag Associations ─────────────────────────────────────────────────
    for (note_id, tag_id) in [
        (note1, tag_medicine),
        (note1, tag_ritual),
        (note1, tag_kandy),
        (note2, tag_coastal),
        (note2, tag_ecology),
        (note3, tag_ayurveda),
        (note4, tag_ritual),
        (note4, tag_ella),
        (note5, tag_trade),
        (note5, tag_markets),
    ] {
        sqlx::query(
            "INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        )
        .bind(note_id)
        .bind(tag_id)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Inventory Items ───────────────────────────────────────────────────────
    for (i, (name, icon, status)) in [
        ("Camera (Sony A7)", "📷", "charged"),
        ("External Mic", "🎙", "ready"),
        ("Powerbank", "🔋", "low"),
        ("SD Cards (×3)", "💾", "packed"),
        ("Headphones", "🎧", "missing"),
        ("Field Notebook", "📓", "packed"),
    ]
    .iter()
    .enumerate()
    {
        sqlx::query(
            "INSERT INTO inventory_items (id, workspace_id, name, icon, status, sort_order) \
             VALUES ($1, $2, $3, $4, $5::inventory_status, $6)",
        )
        .bind(Uuid::new_v4())
        .bind(workspace_id)
        .bind(name)
        .bind(icon)
        .bind(status)
        .bind((i + 1) as i32)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Routines ──────────────────────────────────────────────────────────────
    let checklist1 = serde_json::json!([
        {"label": "Charge all batteries", "done": true},
        {"label": "Format SD cards", "done": true},
        {"label": "Pack microphone", "done": false},
        {"label": "Download offline maps", "done": false},
        {"label": "Backup previous recordings", "done": true}
    ]);
    let checklist2 = serde_json::json!([
        {"label": "Check weather forecast", "done": false},
        {"label": "Calibrate GPS", "done": false},
        {"label": "Review interview questions", "done": false},
        {"label": "Test audio levels", "done": false}
    ]);

    sqlx::query(
        "INSERT INTO routines (id, workspace_id, name, checklist, is_active) \
         VALUES ($1, $2, $3, $4, true)",
    )
    .bind(Uuid::new_v4())
    .bind(workspace_id)
    .bind("Pre-Trip Equipment Check")
    .bind(&checklist1)
    .execute(&mut *tx)
    .await?;

    sqlx::query(
        "INSERT INTO routines (id, workspace_id, name, checklist, is_active) \
         VALUES ($1, $2, $3, $4, false)",
    )
    .bind(Uuid::new_v4())
    .bind(workspace_id)
    .bind("Morning Field Protocol")
    .bind(&checklist2)
    .execute(&mut *tx)
    .await?;

    // ─── Graph Edges ───────────────────────────────────────────────────────────
    for (src_type, src_id, tgt_type, tgt_id, edge_type, strength, label, is_dashed) in [
        (
            "entity",
            ent_priya,
            "entity",
            ent_loc_kandy,
            "entity_location",
            0.9_f64,
            "Based in",
            false,
        ),
        (
            "entity",
            ent_priya,
            "concept",
            con_medicine,
            "entity_concept",
            0.85,
            "Practices",
            false,
        ),
        (
            "entity",
            ent_priya,
            "entity",
            ent_sida,
            "entity_co_mention",
            0.7,
            "Uses",
            false,
        ),
        (
            "entity",
            ent_nimal,
            "entity",
            ent_loc_galle,
            "entity_location",
            0.9,
            "Based in",
            false,
        ),
        (
            "entity",
            ent_nimal,
            "concept",
            con_ecology,
            "entity_concept",
            0.6,
            "Observes",
            false,
        ),
        (
            "entity",
            ent_elder,
            "entity",
            ent_loc_ella,
            "entity_location",
            0.8,
            "Presides",
            false,
        ),
        (
            "entity",
            ent_elder,
            "concept",
            con_ritual,
            "entity_concept",
            0.95,
            "Leads",
            false,
        ),
        (
            "concept",
            con_medicine,
            "concept",
            con_ritual,
            "concept_concept",
            0.65,
            "Related to",
            false,
        ),
        (
            "entity",
            ent_loc_kandy,
            "entity",
            ent_loc_galle,
            "cross_region",
            0.3,
            "Trade route",
            true,
        ),
        (
            "entity",
            ent_vendors,
            "entity",
            ent_loc_colombo,
            "entity_location",
            0.85,
            "Based in",
            false,
        ),
        (
            "concept",
            con_medicine,
            "concept",
            con_ecology,
            "concept_concept",
            0.5,
            "Depends on",
            false,
        ),
        (
            "entity",
            ent_loc_peradeniya,
            "concept",
            con_ecology,
            "location_concept",
            0.7,
            "Research site",
            false,
        ),
    ] {
        sqlx::query(
            "INSERT INTO graph_edges \
             (workspace_id, source_type, source_id, target_type, target_id, \
              edge_type, strength, label, is_dashed) \
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING",
        )
        .bind(workspace_id)
        .bind(src_type)
        .bind(src_id)
        .bind(tgt_type)
        .bind(tgt_id)
        .bind(edge_type)
        .bind(strength)
        .bind(label)
        .bind(is_dashed)
        .execute(&mut *tx)
        .await?;
    }

    // ─── Media ─────────────────────────────────────────────────────────────────

    // Audio files
    for (note_id, s3_key, filename, file_size, duration, label, transcription) in [
        (
            note1,
            "/mock/audio/kandy-interview.webm",
            "kandy-interview.webm",
            18432000_i64,
            1394_i32,
            "Interview Recording",
            "Priya Ratnam described the lunar harvesting cycles used for medicinal plants...",
        ),
        (
            note3,
            "/mock/audio/forest-trail.webm",
            "forest-trail.webm",
            5242880,
            522,
            "Forest Trail Recording",
            "Audio recording from the Peradeniya botanical garden trail...",
        ),
        (
            note5,
            "/mock/audio/market-vendors.webm",
            "market-vendors.webm",
            29360128,
            2468,
            "Vendor Interviews",
            "Three vendors confirm the trade route for dried herbs...",
        ),
    ] {
        sqlx::query(
            "INSERT INTO media \
             (id, note_id, media_type, s3_key, original_filename, mime_type, \
              file_size_bytes, duration_seconds, label, transcription_status, \
              transcription_text, sort_order) \
             VALUES ($1,$2,'audio',$3,$4,'audio/webm',$5,$6,$7,'completed',$8,0)",
        )
        .bind(Uuid::new_v4())
        .bind(note_id)
        .bind(s3_key)
        .bind(filename)
        .bind(file_size)
        .bind(duration)
        .bind(label)
        .bind(transcription)
        .execute(&mut *tx)
        .await?;
    }

    // Photos for note 1 (Kandy Interview)
    for (sort_order, (s3_key, filename, label)) in [
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Sida+r.",
            "sida-rhombifolia.jpg",
            "Sida r.",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Clay+mortar",
            "clay-mortar.jpg",
            "Clay mortar",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Drying+rack",
            "drying-rack.jpg",
            "Drying rack",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Herb+7",
            "herb-7.jpg",
            "Herb #7",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Herb+8",
            "herb-8.jpg",
            "Herb #8",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Garden+path",
            "garden-path.jpg",
            "Garden path",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Priya+garden",
            "priya-garden.jpg",
            "Priya garden",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Herb+press",
            "herb-press.jpg",
            "Herb press",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Kandy+view",
            "kandy-view.jpg",
            "Kandy view",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Highland+forest",
            "highland-forest.jpg",
            "Highland forest",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Root+sample",
            "root-sample.jpg",
            "Root sample",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Preparation",
            "preparation.jpg",
            "Preparation",
        ),
    ]
    .iter()
    .enumerate()
    {
        sqlx::query(
            "INSERT INTO media \
             (id, note_id, media_type, s3_key, original_filename, mime_type, label, sort_order) \
             VALUES ($1,$2,'photo',$3,$4,'image/jpeg',$5,$6)",
        )
        .bind(Uuid::new_v4())
        .bind(note1)
        .bind(*s3_key)
        .bind(*filename)
        .bind(*label)
        .bind(sort_order as i32)
        .execute(&mut *tx)
        .await?;
    }

    // Photos for note 4 (Ritual Ceremony)
    for (sort_order, (s3_key, filename, label)) in [
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Ceremony+start",
            "ceremony-1.jpg",
            "Ceremony start",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Elder+chanting",
            "ceremony-2.jpg",
            "Elder chanting",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Herbal+prep",
            "ceremony-3.jpg",
            "Herbal preparation",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Cave+entrance",
            "ceremony-4.jpg",
            "Cave entrance",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Ritual+items",
            "ceremony-5.jpg",
            "Ritual items",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Offerings",
            "ceremony-6.jpg",
            "Offerings",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Incense",
            "ceremony-7.jpg",
            "Incense",
        ),
        (
            "https://placehold.co/200x180/E8DDD0/4A3F38?text=Final+blessing",
            "ceremony-8.jpg",
            "Final blessing",
        ),
    ]
    .iter()
    .enumerate()
    {
        sqlx::query(
            "INSERT INTO media \
             (id, note_id, media_type, s3_key, original_filename, mime_type, label, sort_order) \
             VALUES ($1,$2,'photo',$3,$4,'image/jpeg',$5,$6)",
        )
        .bind(Uuid::new_v4())
        .bind(note4)
        .bind(*s3_key)
        .bind(*filename)
        .bind(*label)
        .bind(sort_order as i32)
        .execute(&mut *tx)
        .await?;
    }

    tx.commit().await?;

    tracing::info!(
        "Seeded demo workspace {} for user {}",
        workspace_id,
        user_id
    );

    Ok(())
}
