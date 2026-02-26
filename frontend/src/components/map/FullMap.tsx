import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMapLocations } from '../../hooks/useMap';
import { useUIStore } from '../../stores/uiStore';
import { useEditorStore } from '../../stores/editorStore';
import type { MapLocation } from '../../types';

// ---------------------------------------------------------------------------
// Sri Lanka SVG path (simplified, hand-tuned to fit a 400×600 viewBox)
// ---------------------------------------------------------------------------

// Approximate outline of Sri Lanka.  Points are (x, y) in viewBox units
// where (0,0) = top-left corner of the bounding box.
const SRI_LANKA_PATH =
  'M 195,14 C 210,12 230,18 245,28 C 262,40 275,58 278,75 ' +
  'C 284,95 280,115 275,132 C 270,150 262,165 258,180 ' +
  'C 270,195 278,212 280,230 C 283,250 278,268 272,283 ' +
  'C 264,302 252,318 240,333 C 228,348 215,362 205,375 ' +
  'C 195,388 188,402 185,415 C 182,428 182,442 178,452 ' +
  'C 174,462 168,470 162,476 C 155,482 148,485 140,484 ' +
  'C 130,483 120,478 112,470 C 104,462 98,450 94,437 ' +
  'C 90,424 90,410 92,397 C 94,382 100,368 105,354 ' +
  'C 110,340 115,326 115,312 C 115,298 110,284 104,272 ' +
  'C 96,258 85,246 78,232 C 70,218 64,202 60,186 ' +
  'C 56,170 55,152 56,135 C 57,118 62,100 68,85 ' +
  'C 76,68 86,52 98,40 C 110,28 125,18 140,13 ' +
  'C 155,8 172,7 185,10 Z';

// Highlands region (central mountainous area)
const HIGHLANDS_PATH =
  'M 170,150 C 185,140 205,138 220,145 C 238,153 250,168 255,185 ' +
  'C 260,202 258,220 250,235 C 240,250 225,260 210,264 ' +
  'C 195,268 178,265 165,257 C 150,248 140,234 137,218 ' +
  'C 133,200 136,182 145,168 C 152,158 162,154 170,150 Z';

// ---------------------------------------------------------------------------
// Coordinate projection
// Lat/Lng bounding box of Sri Lanka (with a little padding)
// ---------------------------------------------------------------------------
const LAT_MIN = 5.85;
const LAT_MAX = 9.95;
const LNG_MIN = 79.65;
const LNG_MAX = 81.95;

// The SVG viewport for the island
const VIEW_W = 340;
const VIEW_H = 510;
const VIEW_PAD = 20;

/** Project a geographic lat/lng to SVG x/y coordinates. */
function project(lat: number, lng: number): { x: number; y: number } {
  const lngFrac = (lng - LNG_MIN) / (LNG_MAX - LNG_MIN);
  const latFrac = 1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN); // invert y
  return {
    x: VIEW_PAD + lngFrac * (VIEW_W - VIEW_PAD * 2),
    y: VIEW_PAD + latFrac * (VIEW_H - VIEW_PAD * 2),
  };
}

// ---------------------------------------------------------------------------
// Pin appearance by note type / source
// ---------------------------------------------------------------------------

interface PinStyle {
  color: string;
  icon: string;
}

function pinStyle(loc: MapLocation): PinStyle {
  if (loc.source_type === 'entity') {
    return { color: '#6B8C7A', icon: '📍' };
  }
  switch (loc.note_type) {
    case 'interview':
      return { color: '#CF6A4C', icon: '🎙' };
    case 'voice_memo':
      return { color: '#6B8C7A', icon: '🎤' };
    case 'photo':
      return { color: '#CF6A4C', icon: '📷' };
    case 'field_note':
    default:
      return { color: '#C4844A', icon: '📋' };
  }
}

function pinRadius(loc: MapLocation): number {
  const base = loc.source_type === 'entity' ? 9 : 7;
  return Math.min(base + loc.note_count * 1.5, 18);
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type FilterType = 'all' | 'interviews' | 'field_notes' | 'photos';

function filterMatches(loc: MapLocation, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'interviews') return loc.note_type === 'interview';
  if (filter === 'field_notes') return loc.note_type === 'field_note' || loc.note_type === 'voice_memo';
  if (filter === 'photos') return loc.note_type === 'photo';
  return true;
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipState {
  x: number;
  y: number;
  loc: MapLocation;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FullMap() {
  const { data: locations = [], isLoading } = useMapLocations();
  const navigate = useNavigate();
  const setSelectedEntityId = useUIStore((s) => s.setSelectedEntityId);
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);

  const [filter, setFilter] = useState<FilterType>('all');
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Pan/zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  // isDraggingRef is used in event handlers (perf-sensitive); isDraggingState drives render (cursor/transition)
  const isDraggingRef = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleLocations = locations.filter((l) => filterMatches(l, filter));

  // ── Zoom handlers ──────────────────────────────────────────────────────────
  const zoomIn = () => setScale((s) => Math.min(s * 1.35, 6));
  const zoomOut = () => setScale((s) => Math.max(s / 1.35, 0.4));
  const zoomReset = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    setScale((s) => Math.min(Math.max(s * delta, 0.4), 6));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Pan handlers ───────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('[data-pin]')) return; // don't pan on pin click
    isDraggingRef.current = true;
    setIsDraggingState(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
    setIsDraggingState(false);
  };

  // ── Pin click ──────────────────────────────────────────────────────────────
  const handlePinClick = (loc: MapLocation) => {
    setSelectedId(loc.id);
    if (loc.source_type === 'entity') {
      setSelectedEntityId(loc.source_id);
      navigate('/journal');
    } else {
      setActiveNoteId(loc.source_id);
      navigate('/journal');
    }
  };

  // ── Unique sites count ─────────────────────────────────────────────────────
  const siteNames = new Set(visibleLocations.map((l) => l.location_name ?? l.name));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        background: 'linear-gradient(160deg, #c8dce8 0%, #b8cdd8 40%, #a8c0ce 100%)',
        cursor: isDraggingState ? 'grabbing' : 'grab',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {/* ── Ocean grid ─────────────────────────────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => (
          <g key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke="rgba(255,255,255,.08)" strokeWidth="0.3" />
            <line x1="0" y1={v} x2="100" y2={v} stroke="rgba(255,255,255,.08)" strokeWidth="0.3" />
          </g>
        ))}
        {/* Compass rose decoration (top-left) */}
        <g transform="translate(6,6)">
          <circle cx="0" cy="0" r="3.5" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="0.4" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(255,255,255,.3)" strokeWidth="0.4" />
          <line x1="-3" y1="0" x2="3" y2="0" stroke="rgba(255,255,255,.3)" strokeWidth="0.4" />
          <text x="0" y="-4.5" textAnchor="middle" fontSize="2" fill="rgba(255,255,255,.5)" fontFamily="sans-serif">N</text>
        </g>
      </svg>

      {/* ── Panning + zooming container ─────────────────────────────────── */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isDraggingState ? 'none' : 'transform 0.05s',
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width={VIEW_W}
          height={VIEW_H}
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* Subtle drop shadow for island */}
          <defs>
            <filter id="island-shadow" x="-10%" y="-5%" width="120%" height="120%">
              <feDropShadow dx="3" dy="4" stdDeviation="6" floodColor="#1a3040" floodOpacity="0.22" />
            </filter>
            <filter id="pin-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="land-grad" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ddebd4" />
              <stop offset="60%" stopColor="#c8dcc0" />
              <stop offset="100%" stopColor="#b8cdb4" />
            </radialGradient>
            <radialGradient id="highlands-grad" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#c0d4b4" />
              <stop offset="100%" stopColor="#a8c0a0" />
            </radialGradient>
          </defs>

          {/* Island body */}
          <path
            d={SRI_LANKA_PATH}
            fill="url(#land-grad)"
            stroke="#a0b8a4"
            strokeWidth="1.5"
            filter="url(#island-shadow)"
          />

          {/* Highland region */}
          <path
            d={HIGHLANDS_PATH}
            fill="url(#highlands-grad)"
            stroke="#90a890"
            strokeWidth="0.8"
            opacity="0.7"
          />

          {/* Latitude / longitude tick marks */}
          {[6, 7, 8, 9].map((lat) => {
            const { y } = project(lat, LNG_MIN);
            return (
              <g key={`lat-${lat}`}>
                <line x1={VIEW_PAD - 6} y1={y} x2={VIEW_PAD} y2={y} stroke="rgba(255,255,255,.5)" strokeWidth="0.6" />
                <text x={VIEW_PAD - 8} y={y + 3} textAnchor="end" fontSize="7" fill="rgba(255,255,255,.55)" fontFamily="sans-serif">{lat}°</text>
              </g>
            );
          })}
          {[80, 81].map((lng) => {
            const { x } = project(LAT_MIN, lng);
            return (
              <g key={`lng-${lng}`}>
                <line x1={x} y1={VIEW_H - VIEW_PAD} x2={x} y2={VIEW_H - VIEW_PAD + 6} stroke="rgba(255,255,255,.5)" strokeWidth="0.6" />
                <text x={x} y={VIEW_H - VIEW_PAD + 15} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,.55)" fontFamily="sans-serif">{lng}°E</text>
              </g>
            );
          })}

          {/* Scale bar */}
          <g transform={`translate(${VIEW_PAD}, ${VIEW_H - VIEW_PAD + 22})`}>
            <line x1="0" y1="0" x2="50" y2="0" stroke="rgba(255,255,255,.6)" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="rgba(255,255,255,.6)" strokeWidth="1" />
            <line x1="50" y1="-3" x2="50" y2="3" stroke="rgba(255,255,255,.6)" strokeWidth="1" />
            <text x="25" y="-5" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,.6)" fontFamily="sans-serif">~100 km</text>
          </g>

          {/* Location pins */}
          {visibleLocations.map((loc) => {
            const { x, y } = project(loc.lat, loc.lng);
            const { color } = pinStyle(loc);
            const r = pinRadius(loc);
            const isSelected = selectedId === loc.id;

            return (
              <g
                key={loc.id}
                data-pin="true"
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); handlePinClick(loc); }}
                onMouseEnter={(e) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) {
                    // Tooltip position is in screen coords relative to the container
                    const svgEl = svgRef.current!;
                    const pt = svgEl.createSVGPoint();
                    pt.x = x;
                    pt.y = y;
                    const ctm = svgEl.getScreenCTM();
                    if (ctm) {
                      const screenPt = pt.matrixTransform(ctm);
                      const containerRect = containerRef.current?.getBoundingClientRect();
                      if (containerRect) {
                        setTooltip({
                          x: screenPt.x - containerRect.left,
                          y: screenPt.y - containerRect.top,
                          loc,
                        });
                      }
                    }
                  }
                  void e;
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                {/* Pulsing ring for selected/active pin */}
                {isSelected && (
                  <circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeWidth="1.5" opacity="0.4">
                    <animate attributeName="r" values={`${r + 4};${r + 10};${r + 4}`} dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Outer halo (hover-visible via CSS) */}
                <circle
                  cx={x}
                  cy={y}
                  r={r + 4}
                  fill={color}
                  opacity="0.15"
                />

                {/* Pin shadow */}
                <circle cx={x + 1} cy={y + 1.5} r={r} fill="rgba(0,0,0,0.18)" />

                {/* Pin body */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={color}
                  stroke="white"
                  strokeWidth="1.8"
                  style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.25))' }}
                />

                {/* Entity pins get a larger dot center; note pins get a smaller indicator */}
                <circle
                  cx={x}
                  cy={y}
                  r={r * 0.32}
                  fill="rgba(255,255,255,0.85)"
                />

                {/* Note count badge (only when > 1) */}
                {loc.note_count > 1 && (
                  <g>
                    <circle cx={x + r * 0.7} cy={y - r * 0.7} r={r * 0.48} fill="#CF6A4C" stroke="white" strokeWidth="1" />
                    <text
                      x={x + r * 0.7}
                      y={y - r * 0.7 + 2.5}
                      textAnchor="middle"
                      fontSize={r * 0.48}
                      fill="white"
                      fontWeight="bold"
                      fontFamily="sans-serif"
                    >
                      {loc.note_count}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Tooltip ─────────────────────────────────────────────────────── */}
      {tooltip && <MapTooltip tooltip={tooltip} />}

      {/* ── Filter pills (top-right) ─────────────────────────────────────── */}
      <div
        className="absolute top-4 right-4 flex flex-col gap-2"
        style={{ zIndex: 10 }}
      >
        {/* Zoom controls */}
        <div
          className="flex flex-col rounded-xl overflow-hidden"
          style={{
            background: 'rgba(250,247,242,0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 10px rgba(42,36,32,0.10)',
          }}
        >
          <ZoomButton label="+" onClick={zoomIn} title="Zoom in" />
          <div style={{ height: 1, background: 'rgba(42,36,32,0.08)' }} />
          <ZoomButton label="−" onClick={zoomOut} title="Zoom out" />
          <div style={{ height: 1, background: 'rgba(42,36,32,0.08)' }} />
          <ZoomButton label="⌂" onClick={zoomReset} title="Reset view" />
        </div>

        {/* Filter pills */}
        <div
          className="flex flex-col gap-1 p-1.5 rounded-xl"
          style={{
            background: 'rgba(250,247,242,0.92)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 2px 10px rgba(42,36,32,0.10)',
          }}
        >
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'interviews', label: 'Interviews' },
              { key: 'field_notes', label: 'Field Notes' },
              { key: 'photos', label: 'Photos' },
            ] as { key: FilterType; label: string }[]
          ).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-colors text-left cursor-pointer ${
                filter === f.key
                  ? 'bg-coral text-white'
                  : 'text-ink-muted hover:bg-sand'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Info panel (bottom-left) ─────────────────────────────────────── */}
      <div
        className="absolute bottom-5 left-5 px-3.5 py-2.5 rounded-xl"
        style={{
          background: 'rgba(250,247,242,0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 2px 10px rgba(42,36,32,0.10)',
          zIndex: 10,
        }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-coral/30 border-t-coral rounded-full animate-spin" />
            <span className="text-[11px] text-ink-muted">Loading locations…</span>
          </div>
        ) : visibleLocations.length === 0 ? (
          <p className="text-[11px] text-ink-muted">No locations to show</p>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-ink leading-tight">
              {visibleLocations.length} location{visibleLocations.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              across {siteNames.size} site{siteNames.size !== 1 ? 's' : ''}
            </p>
          </>
        )}

        {/* Legend */}
        <div className="mt-2 pt-2 border-t border-border-light flex flex-col gap-1">
          <LegendItem color="#CF6A4C" label="Interview" />
          <LegendItem color="#C4844A" label="Field Note" />
          <LegendItem color="#6B8C7A" label="Location" />
        </div>
      </div>

      {/* ── Empty state overlay ───────────────────────────────────────── */}
      {!isLoading && locations.length === 0 && <MapEmptyState />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ZoomButton({ label, onClick, title }: { label: string; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center text-ink-muted hover:text-coral hover:bg-coral/5 transition-colors text-[15px] cursor-pointer"
    >
      {label}
    </button>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[10.5px] text-ink-muted font-medium">{label}</span>
    </div>
  );
}

function MapTooltip({ tooltip }: { tooltip: TooltipState }) {
  const { x, y, loc } = tooltip;
  const { icon } = pinStyle(loc);
  const offsetX = x + 16;
  const offsetY = y - 10;

  return (
    <div
      className="absolute pointer-events-none px-3 py-2 rounded-xl max-w-[200px]"
      style={{
        left: offsetX,
        top: offsetY,
        background: 'rgba(42,36,32,0.92)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        zIndex: 50,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-[13px]">{icon}</span>
        <span className="text-[12.5px] font-semibold text-white leading-tight">{loc.name}</span>
      </div>
      {loc.note_type && (
        <p className="text-[10.5px] text-white/60 capitalize">
          {loc.note_type.replace('_', ' ')}
        </p>
      )}
      {loc.note_count > 0 && (
        <p className="text-[10.5px] text-white/55 mt-0.5">
          {loc.note_count} note{loc.note_count !== 1 ? 's' : ''}
        </p>
      )}
      <p className="text-[10px] text-white/40 mt-0.5">
        {loc.lat.toFixed(4)}°N, {loc.lng.toFixed(4)}°E
      </p>
    </div>
  );
}

function MapEmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="flex flex-col items-center gap-4 px-8 py-8 rounded-2xl max-w-[400px] text-center pointer-events-auto"
        style={{
          background: 'rgba(250,247,242,0.90)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.65)',
          boxShadow: '0 8px 32px rgba(42,36,32,0.12)',
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl"
          style={{ background: 'rgba(107,140,122,0.12)', border: '1px solid rgba(107,140,122,0.2)' }}
        >
          📍
        </div>
        <div>
          <h2 className="font-serif text-[18px] font-semibold text-ink mb-2">
            No field locations yet
          </h2>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Add GPS coordinates or location names to your notes to see them plotted on the map.
          </p>
        </div>
      </div>
    </div>
  );
}
