# ArchiveMind Design System

Extracted from `archivemind-mockup.html`. This is the canonical reference for all visual design decisions.

---

## Color Tokens

### CSS Custom Properties

```css
:root {
  /* ─── Backgrounds ─── */
  --cream:        #FAF7F2;   /* App background */
  --parchment:    #F3EDE3;   /* Secondary surfaces, inputs, meta chips */
  --warm-white:   #FDFAF6;   /* Editor area, cards */
  --sand:         #E8DDD0;   /* Hover states, count badges, tags */
  --sand-dark:    #D4C8B8;   /* Scrollbar thumbs, inactive strength bars */

  /* ─── Accent: Coral (Primary) ─── */
  --coral:        #CF6A4C;   /* Primary actions, active rail, play button, entity mentions */
  --coral-light:  #E07B5A;   /* Hover on primary actions */
  --coral-dark:   #B85A3A;   /* Text on coral-tinted backgrounds */
  --rust:         #8B3A1F;   /* Reserved for deep emphasis */

  /* ─── Accent: Amber (Secondary) ─── */
  --amber:        #C4844A;   /* Offline state, location tags, person nodes */
  --amber-light:  #E0A060;   /* Graph filter button text */

  /* ─── Accent: Sage (Tertiary) ─── */
  --sage:         #6B8C7A;   /* Online/synced state, concept tags, transcription badge */
  --sage-light:   #8BA898;   /* Graph filter button text */

  /* ─── Text / Ink ─── */
  --ink:          #2A2420;   /* Primary text, headings */
  --ink-mid:      #4A3F38;   /* Body text */
  --ink-soft:     #6B5E55;   /* Muted body, field note badge text */
  --ink-muted:    #9A8B82;   /* Meta text, placeholders (non-ghost), labels */
  --ink-ghost:    #C4B8B0;   /* Placeholder text, faintest meta items */

  /* ─── Structural ─── */
  --sidebar-bg:   #F0E9DF;   /* Icon rail, sidebar, status bar backgrounds */
  --panel-bg:     #F8F4EE;   /* Note list panel */
  --card-bg:      #FDFAF6;   /* Active note card */
  --border:       #E0D8CC;   /* Primary borders */
  --border-light: #EDE8E0;   /* Light separators */

  /* ─── Glows & Overlays ─── */
  --glow-coral:   rgba(207,106,76,0.12);   /* Active button backgrounds, focus rings */
  --glow-amber:   rgba(196,132,74,0.10);   /* Amber accent glow */
  --node-color:   #CF6A4C;                 /* Graph node default */
  --node-edge:    rgba(207,106,76,0.35);   /* Graph node shadow */
}
```

### Semantic Color Usage

| Context | Color | Token/Value |
|---------|-------|-------------|
| Primary action | Coral | `--coral` |
| Synced/online | Sage dot | `--sage` |
| Offline | Amber dot | `--amber` |
| Entity mention bg | Coral 10% | `rgba(207,106,76,0.10)` |
| Entity mention border | Coral 25% | `rgba(207,106,76,0.25)` |
| Concept tag bg | Sage 10% | `rgba(107,140,122,0.10)` |
| Concept tag border | Sage 25% | `rgba(107,140,122,0.25)` |
| Location tag bg | Amber 10% | `rgba(196,132,74,0.10)` |
| Location tag border | Amber 25% | `rgba(196,132,74,0.25)` |
| Graph overlay bg | Ink 92% | `rgba(42,36,32,0.92)` |

---

## Typography

### Font Stack

| Font | Family | Usage |
|------|--------|-------|
| **Lora** | Serif | Headings, titles, note body, avatar initials, entity names |
| **DM Sans** | Sans-serif | UI body text, buttons, labels, meta text, tags |
| **JetBrains Mono** | Monospace | Audio duration, status bar technical info, stat numbers |

Google Fonts import:
```
Lora:ital,wght@0,400;0,500;0,600;1,400
DM Sans:wght@300;400;500;600
JetBrains Mono:wght@400;500
```

### Type Scale

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Note heading (editor) | Lora | 28px | 600 | 1.25 |
| Graph title | Lora | 18px | 600 | — |
| Section title (sidebar/note list) | Lora | 15px | 600 | — |
| Note body | Lora | 15px | 400 | 1.8 |
| Entity panel name | Lora | 14px | 600 | — |
| App identity | Lora | 14px | 600 | — |
| Note card title | Lora | 13.5px | 500 | 1.3 |
| Entity panel title | Lora | 13.5px | 600 | — |
| Connected note title | Lora | 12.5px | 500 | — |
| Routine banner title | DM Sans | 13px | 600 | — |
| View tab | DM Sans | 12.5px | 500/600 | — |
| Tool button | DM Sans | 12.5px | 500 | — |
| Search input | DM Sans | 12.5px | 400 | — |
| Sidebar item | DM Sans | 13px | 400/500 | — |
| Note card excerpt | DM Sans | 12px | 400 | 1.5 |
| Entity chip | DM Sans | 11.5px | 400 | — |
| Meta chip | DM Sans | 11.5px | 400 | — |
| Sync status | DM Sans | 11.5px | 400 | — |
| EP tab | DM Sans | 11.5px | 500 | — |
| Status bar | DM Sans | 11px | 400 | — |
| Sidebar count badge | DM Sans | 11px | 400 | — |
| Section label | DM Sans | 10px | 600 | — |
| Note type badge | DM Sans | 10px | 600 | — |
| Inventory status | DM Sans | 10px | 600 | — |
| Tag | DM Sans | 10px | 400 | — |
| Audio duration | JetBrains Mono | 11px | 400 | — |
| EP stat number | JetBrains Mono | 16px | 500 | — |
| Status bar tech | JetBrains Mono | 11px | 400 | — |

### Text Conventions
- Section labels: `text-transform: uppercase; letter-spacing: 0.1em`
- EP stat labels: `text-transform: uppercase; letter-spacing: 0.04em`
- Note card excerpts: `-webkit-line-clamp: 2` (2-line truncation)
- Connected note titles: `text-overflow: ellipsis` (single-line truncation)

---

## Spacing & Layout

### App Layout (Flexbox, 100vh)
```
┌──────┬──────────┬──────────┬────────────────────┬──────────┐
│ Rail │ Sidebar  │ Note List│   Editor Area      │ Entity   │
│ 56px │ 240px    │ 260px    │   flex: 1          │ Panel    │
│      │          │          │                    │ 280px    │
└──────┴──────────┴──────────┴────────────────────┴──────────┘
└────────────────────────────────────────────────────────────┘
│ Status Bar (26px height)                                   │
└────────────────────────────────────────────────────────────┘
```

### Common Spacing Values
- Icon rail padding: `12px 0` vertical, `4px` gap
- Sidebar header: `16px 16px 12px`
- Sidebar body: `12px 8px`
- Sidebar section gap: `20px` (margin-bottom)
- Sidebar items: `7px 8px` padding, `9px` gap
- Note list body: `8px` padding
- Note card: `12px` padding, `4px` margin-bottom
- Editor content: `40px 60px` padding, max-width `780px`
- Entity panel body: `12px` padding
- Status bar: `0 16px` padding, `16px` gap

### Border Radius Scale
| Size | Usage |
|------|-------|
| `4px` | Tiny tags (`.nc-tag`) |
| `5px` | Inline tags (entity mention, concept tag, location tag), tooltip |
| `6px` | Buttons (`.tb-btn`, `.tool-btn`, view tabs, ep tabs) |
| `7px` | Sidebar sync status |
| `8px` | Search box, sidebar items, note heading radius, blockquote corner |
| `10px` | Note cards, inline audio, inventory alert, rail icon |
| `12px` | Entity profile card, mini map, inventory card, routine banner |
| `20px` | Pill badges (note type, count, inventory status, meta chip, entity chip, topic) |
| `24px` | FAB buttons |
| `50%` | Circles (avatars, dots, pins) |

---

## Component Catalog

### Rail Icons
- **Size**: 40×40px
- **Default**: transparent bg, `--ink-muted` color
- **Hover**: `--sand` bg, `--ink` color
- **Active**: `--coral` bg, `#fff` color, `box-shadow: 0 2px 12px rgba(207,106,76,0.35)`
- **Badge**: 7×7px amber dot, positioned top-right (6px,6px), 1.5px sidebar-bg border

### Rail Avatar
- **Size**: 32×32px circle
- **Background**: `linear-gradient(135deg, var(--coral), var(--amber))`
- **Text**: 12px, 600 weight, Lora, white

### Sidebar Items (`.sb-item`)
- **Default**: `--ink-mid` text, transparent bg
- **Hover**: `rgba(255,255,255,0.6)` bg
- **Active**: `#fff` bg, `--ink` text, weight 500, `box-shadow: 0 1px 4px rgba(0,0,0,0.06)`
- **Icon**: 14px, 20px width, `--coral` color
- **Count badge**: 11px, `--sand` bg, `--ink-ghost` text; active: `--glow-coral` bg, `--coral` text

### Search Box
- **Default**: `rgba(255,255,255,0.7)` bg, `--border` border, `8px` radius
- **Focus**: `#fff` bg, `--coral` border, `0 0 0 3px var(--glow-coral)` ring

### Note Cards (`.note-card`)
- **Default**: transparent bg, `1.5px solid transparent` border
- **Hover**: `rgba(255,255,255,0.7)` bg
- **Active**: `--card-bg` bg, `--border` border color, `box-shadow: 0 2px 8px rgba(0,0,0,0.06)`

### Note Type Badges (`.nc-type`)
| Type | Class | Background | Text Color |
|------|-------|------------|------------|
| Interview | `.type-interview` | `rgba(207,106,76,0.12)` | `--coral-dark` |
| Photo | `.type-photo` | `rgba(107,140,122,0.12)` | `--sage` |
| Voice/Memo | `.type-memo` | `rgba(196,132,74,0.12)` | `--amber` |
| Field Note | `.type-field` | `rgba(42,36,32,0.07)` | `--ink-soft` |

### Inline Tags (Editor Body)

**Entity Mention** (`.entity-mention`):
- bg: `rgba(207,106,76,0.10)`, border: `rgba(207,106,76,0.25)`, text: `--coral-dark`
- Hover: bg `rgba(207,106,76,0.18)`, border `--coral`

**Concept Tag** (`.concept-tag`):
- bg: `rgba(107,140,122,0.10)`, border: `rgba(107,140,122,0.25)`, text: `--sage`
- Hover: bg `rgba(107,140,122,0.18)`, border `--sage`

**Location Tag** (`.location-tag`):
- bg: `rgba(196,132,74,0.10)`, border: `rgba(196,132,74,0.25)`, text: `--amber`

### Entity Chip (Meta Bar)
- bg: `rgba(207,106,76,0.08)`, border: `rgba(207,106,76,0.2)`, text: `--coral-dark`
- Hover: bg `rgba(207,106,76,0.15)`
- Pill shape: `border-radius: 20px`

### Meta Chip
- bg: `--parchment`, border: `--border-light`, text: `--ink-muted`
- Hover: border `--coral`, text `--coral`
- Pill shape: `border-radius: 20px`

### Toolbar Buttons

**`.tb-btn`** (icon buttons, 28×28px):
- Default: transparent, `--ink-muted`
- Hover: `--sand` bg, `--ink`
- Active: `--glow-coral` bg, `--coral`

**`.tool-btn`** (formatting row):
- Default: transparent, `--ink-muted`
- Hover: `--parchment` bg, `--ink`
- Active: `--glow-coral` bg, `--coral`

**`.icon-btn`** (note list):
- Default: transparent, `--ink-muted`, 28×28px
- Hover: `--sand` bg, `--ink`
- Primary variant: `--coral` bg, white, `box-shadow: 0 2px 8px rgba(207,106,76,0.3)`

### View Tabs
- Container: `--parchment` bg, `--border` border, 8px radius, 3px padding
- Default: transparent, `--ink-muted`, 12.5px 500
- Hover: `rgba(255,255,255,0.7)` bg, `--ink`
- Active: `#fff` bg, `--ink`, 600 weight, `box-shadow: 0 1px 4px rgba(0,0,0,0.07)`

### Audio Player (`.inline-audio`)
- Container: `--parchment` bg, `--border` border, 10px radius, `10px 14px` padding
- Play button: 34×34px circle, `--coral` bg, hover scale 1.05
- Waveform bars: 3px wide, `--coral`, 48 bars with varied heights (4–24px)
- Duration: JetBrains Mono 11px, `--ink-muted`
- Transcription badge: 10px, sage bg, pill

### Photo Strip
- Horizontal scroll, 8px gap
- Thumbnails: 80×70px, 8px radius, `--parchment` bg, `1.5px --border` border
- Hover: coral border, scale 1.03
- Meta overlay: gradient to `rgba(42,36,32,0.6)`, JetBrains Mono 9px
- Overflow indicator: "+N more" in 13px, `--ink-muted`

### Entity Profile Card (Right Panel)
- Container: `#fff` bg, 12px radius, `--border-light` border, `0 1px 4px rgba(0,0,0,0.04)` shadow
- Avatar: 38×38px circle, `linear-gradient(135deg, var(--coral), var(--amber))`, Lora 14px 600
- Stats: 3-column flex, `--parchment` bg, 8px radius
  - Number: JetBrains Mono 16px 500, `--coral`
  - Label: 9.5px uppercase, `--ink-muted`
- Topics: pills, `--parchment` bg, `--border` border, hover coral

### Inventory Card
- Container: `#fff` bg, 12px radius, `--border-light` border
- Items: `8px 14px` padding, `--border-light` bottom border, hover `--parchment` bg
- Status badges:
  - Charged/Ready/Packed: sage bg, sage text
  - Low: amber bg, amber text
  - Missing: coral bg, coral text

### Inventory Alert
- `rgba(207,106,76,0.08)` bg, `rgba(207,106,76,0.25)` border, 10px radius
- Count badge: `--coral` bg, white text, pill

### Connected Notes
- Hover: `#fff` bg, `--border` border
- Strength indicator: 3 bars (4×12px), decreasing opacity (1, 0.7, 0.4), `--coral` or `--sand-dark` for inactive

### Routine Banner
- bg: `linear-gradient(135deg, rgba(207,106,76,0.06), rgba(196,132,74,0.06))`
- border: `rgba(207,106,76,0.2)`, 12px radius
- Start button: `--coral` bg, white, 8px radius, hover `--coral-light`

### FAB Buttons
- Primary: `--coral` bg, white, `0 4px 16px rgba(0,0,0,0.12)` shadow
  - Hover: `--coral-light`, translateY(-1px), `0 6px 20px rgba(207,106,76,0.4)` shadow
- Secondary: `--warm-white` bg, `--ink`, `--border` border
  - Hover: `--parchment`, translateY(-1px)
- 24px radius, `10px 18px` padding

### Status Bar
- 26px height, `--sidebar-bg` bg, `--border-light` top border
- 11px text, `--ink-muted`
- Status dot: 6×6px circle

### Tooltip
- `--ink` bg, white text, 11px DM Sans
- `3px 8px` padding, 5px radius
- Positioned above element (6px gap), opacity transition

### Graph Overlay (Dark Theme)
- Full-screen fixed, `rgba(42,36,32,0.92)` bg, `backdrop-filter: blur(4px)`
- Header: `rgba(255,255,255,0.1)` bottom border
- Title: Lora 18px 600, `--cream` color
- Close button: 36×36px, 8px radius, `rgba(255,255,255,0.1)` border
- Filter buttons: pill, various accent colors with 0.5 opacity borders
- Zoom controls: 34×34px, 8px radius, `rgba(255,255,255,0.06)` bg
- Legend: `rgba(250,247,242,0.6)` text, 11px, 10×10px dots
- **Node colors**:
  - Locations: `rgba(207,106,76, 0.55–0.88)` (coral)
  - Concepts: `rgba(107,140,122, 0.55–0.9)` (sage)
  - People/Entities: `rgba(196,132,74, 0.5–0.85)` (amber)
- **Edge lines**: 1.5px stroke, various opacities, dashed for cross-region links
- **Node labels**: DM Sans, `rgba(250,247,242,0.85)` fill

### Offline Bar
- `rgba(196,132,74,0.12)` bg, `rgba(196,132,74,0.25)` border-bottom
- 12px text, `--amber`, 500 weight
- Hidden by default (`display: none`)

---

## Animations

| Name | Duration | Easing | Description |
|------|----------|--------|-------------|
| `pulse-sync` | 2s | ease-in-out, infinite | Scale 1→0.8→1, opacity 1→0.5→1. Sync dot indicator |
| `wave-anim` | 0.6–1.4s (randomized) | ease-in-out, infinite alternate | Height 4px→variable (6–24px). Audio waveform bars |
| `map-pulse` | 2s | ease-out, infinite | Scale 0.5→2, opacity 0.8→0. Map pin pulse ring |
| `fade-in` | 0.25–0.3s | ease | Opacity 0→1. Graph overlay entrance, general fade |

### Transition Defaults
- Most interactive elements: `0.15s` (background, color, all)
- Search box focus: `0.2s`
- FAB buttons: `0.2s`
- Inventory items: `0.12s`
- Graph node circles: `0.2s` (radius, filter)
- Graph edge lines: `0.2s` (stroke-opacity)

---

## Shadows

| Shadow | Usage |
|--------|-------|
| `0 1px 4px rgba(0,0,0,0.04)` | Cards (entity profile, mini map, inventory) |
| `0 1px 4px rgba(0,0,0,0.06)` | Active sidebar item |
| `0 1px 4px rgba(0,0,0,0.07)` | Active view tab, active EP tab |
| `0 2px 8px rgba(0,0,0,0.06)` | Active note card |
| `0 2px 8px rgba(207,106,76,0.3)` | Primary icon button |
| `0 2px 12px rgba(207,106,76,0.35)` | Active rail icon |
| `0 2px 6px rgba(207,106,76,0.3)` | App logo |
| `0 4px 16px rgba(0,0,0,0.12)` | FAB buttons |
| `0 6px 20px rgba(207,106,76,0.4)` | FAB primary hover |
| `0 1px 4px rgba(0,0,0,0.25)` | Map pin dot |

---

## Scrollbar Styling

All scrollable areas use consistent custom scrollbars:
- **Width**: 4px (vertical), 3px (horizontal for photo strip)
- **Track**: transparent
- **Thumb**: `--sand-dark` (#D4C8B8), 2px radius

---

## Blockquote Style

```css
blockquote {
  border-left: 3px solid var(--coral);
  padding: 12px 16px;
  color: var(--ink-soft);
  font-style: italic;
  background: rgba(207,106,76,0.04);
  border-radius: 0 8px 8px 0;
  margin: 1.2em 0;
}
```

---

## Graph Note Callout

```css
/* Inline callout for graph cross-links */
background: var(--parchment);
border-radius: 8px;
border-left: 3px solid var(--amber);
padding: 12px;
font-family: 'DM Sans', sans-serif;
font-size: 13px;
color: var(--ink-muted);
/* Label "Graph Note:" in --amber, bold */
/* Link text in --coral with underline */
```
