import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { useNavigate } from 'react-router-dom';
import { useMapLocations, useTrackMapLoad } from '../../hooks/useMap';
import { useEditorStore } from '../../stores/editorStore';
import { useUIStore } from '../../stores/uiStore';
import { useUpdateNote } from '../../hooks/useNotes';
import type { MapLocation } from '../../types';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? '';

// ---------------------------------------------------------------------------
// Pin colour + size helpers
// ---------------------------------------------------------------------------

function pinColor(loc: MapLocation): string {
  if (loc.source_type === 'entity') return '#6B8C7A';
  switch (loc.note_type) {
    case 'interview': return '#CF6A4C';
    case 'voice_memo': return '#6B8C7A';
    case 'photo':     return '#CF6A4C';
    case 'field_note':
    default:          return '#C4844A';
  }
}

function pinSize(loc: MapLocation): number {
  const base = loc.source_type === 'entity' ? 16 : 12;
  return Math.min(base + loc.note_count * 1.5, 28);
}

function noteTypeLabel(loc: MapLocation): string {
  if (loc.source_type === 'entity') return 'Location';
  switch (loc.note_type) {
    case 'interview':  return 'Interview';
    case 'voice_memo': return 'Voice Memo';
    case 'photo':      return 'Photo Note';
    case 'field_note': return 'Field Note';
    default:           return 'Note';
  }
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

type FilterType = 'all' | 'interviews' | 'field_notes' | 'photos';

function filterMatches(loc: MapLocation, filter: FilterType): boolean {
  if (filter === 'all') return true;
  if (filter === 'interviews') return loc.note_type === 'interview';
  if (filter === 'field_notes') return loc.note_type === 'field_note' || loc.note_type === 'voice_memo';
  if (filter === 'photos')     return loc.note_type === 'photo';
  return true;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface Toast {
  message: string;
  type: 'success' | 'error';
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function FullMap() {
  const { data: locations = [], isLoading } = useMapLocations();
  const trackMapLoad = useTrackMapLoad();
  const navigate = useNavigate();
  const activeNoteId = useEditorStore((s) => s.activeNoteId);
  const setActiveNoteId = useEditorStore((s) => s.setActiveNoteId);
  const mapFlyTo = useUIStore((s) => s.mapFlyTo);
  const setMapFlyTo = useUIStore((s) => s.setMapFlyTo);
  const updateNote = useUpdateNote();

  const [filter, setFilter] = useState<FilterType>('all');
  const [toast, setToast] = useState<Toast | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  // Keep marker refs so we can remove and re-add when filter / data changes
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  // Click-to-add marker (for the active note)
  const clickMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Initialise map ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const container = containerRef.current;

    const map = new mapboxgl.Map({
      container,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [80.6, 7.5],
      zoom: 7,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      // Force a resize so the map fills its container correctly when the
      // component was mounted during a layout transition (e.g. navigating
      // from Journal where the sidebar was visible, changing <main> width).
      map.resize();
      setMapReady(true);
      // Track this Mapbox initialization for usage billing
      trackMapLoad();
    });

    // Also resize whenever the container element itself changes size — this
    // covers the case where the sidebar collapses/expands after the map is
    // already initialised.
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    resizeObserver.observe(container);

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Fly to a requested location (e.g. from location chip click) ──────────

  useEffect(() => {
    if (!mapReady || !mapFlyTo || !mapRef.current) return;
    mapRef.current.flyTo({
      center: [mapFlyTo.lng, mapFlyTo.lat],
      zoom: 13,
      duration: 1200,
      essential: true,
    });
    // Consume the fly-to target so repeated renders don't re-trigger.
    setMapFlyTo(null);
  }, [mapReady, mapFlyTo, setMapFlyTo]);

  // ── Place / refresh markers when data or filter changes ───────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const visibleLocations = locations.filter((l) => filterMatches(l, filter));

    visibleLocations.forEach((loc) => {
      const color = pinColor(loc);
      const size  = pinSize(loc);

      // Build a custom HTML element for the marker
      const el = document.createElement('div');
      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.28);
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.25)';
        el.style.boxShadow = `0 4px 12px rgba(0,0,0,0.35)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.28)';
      });

      // Note count badge
      if (loc.note_count > 1) {
        const badge = document.createElement('span');
        badge.textContent = String(loc.note_count);
        badge.style.cssText = `
          font-size: 8px;
          font-weight: 700;
          color: white;
          font-family: 'DM Sans', sans-serif;
          line-height: 1;
        `;
        el.appendChild(badge);
      }

      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '220px',
        offset: size / 2 + 4,
        className: 'archivemind-popup',
      }).setHTML(buildPopupHTML(loc));

      // Wire the "Open note" button inside the popup after it opens
      popup.on('open', () => {
        const btn = document.getElementById(`open-note-${loc.id}`);
        if (btn) {
          btn.addEventListener('click', () => {
            if (loc.source_type === 'note') {
              setActiveNoteId(loc.source_id);
            }
            navigate('/journal');
          });
        }
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([loc.lng, loc.lat])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [locations, filter, mapReady, navigate, setActiveNoteId]);

  // ── Click-to-add handler (when a note is active) ──────────────────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      if (!activeNoteId) return;

      const { lng, lat } = e.lngLat;

      // Remove previous click marker
      clickMarkerRef.current?.remove();

      // Add a temporary "pending" marker
      const el = document.createElement('div');
      el.style.cssText = `
        width: 18px; height: 18px; border-radius: 50%;
        background: #CF6A4C; border: 2px solid white;
        box-shadow: 0 2px 8px rgba(207,106,76,0.5);
        animation: pulse 1.5s infinite;
      `;
      const pending = new mapboxgl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
      clickMarkerRef.current = pending;

      // Reverse geocode
      let locationName = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality,region`
        );
        if (res.ok) {
          const geo = await res.json();
          const first = geo.features?.[0];
          if (first?.place_name) locationName = first.place_name;
        }
      } catch {
        // fall through with coordinate-based name
      }

      try {
        await updateNote.mutateAsync({
          id: activeNoteId,
          location_lat: lat,
          location_lng: lng,
          location_name: locationName,
          gps_coords: `${lat},${lng}`,
        } as Parameters<typeof updateNote.mutateAsync>[0]);
        showToast(`Location set: ${locationName}`);
      } catch {
        pending.remove();
        clickMarkerRef.current = null;
        showToast('Failed to save location', 'error');
      }
    };

    map.on('click', handleClick);
    return () => { map.off('click', handleClick); };
  }, [activeNoteId, mapReady, updateNote, showToast]);

  // Cleanup click marker when no active note
  useEffect(() => {
    if (!activeNoteId) {
      clickMarkerRef.current?.remove();
      clickMarkerRef.current = null;
    }
  }, [activeNoteId]);

  const visibleCount = locations.filter((l) => filterMatches(l, filter)).length;
  const siteNames    = new Set(
    locations.filter((l) => filterMatches(l, filter)).map((l) => l.location_name ?? l.name)
  );

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Loading overlay */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center z-20"
          style={{ background: '#e8f0ea' }}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-coral/30 border-t-coral rounded-full animate-spin" />
            <span className="text-[12px] text-ink-muted font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Loading map...
            </span>
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Click-to-add banner */}
      {activeNoteId && (
        <div
          className="absolute top-4 left-1/2 z-10 px-4 py-2 rounded-xl text-[12px] font-medium"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(207,106,76,0.92)',
            color: 'white',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 2px 12px rgba(207,106,76,0.35)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Click the map to set this note's location
        </div>
      )}

      {/* Filter pills + Zoom controls — overlaid on the map, top-right */}
      {/* (Mapbox NavigationControl occupies top-right; our pills go above it) */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
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
              { key: 'all',         label: 'All' },
              { key: 'interviews',  label: 'Interviews' },
              { key: 'field_notes', label: 'Field Notes' },
              { key: 'photos',      label: 'Photos' },
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
              style={{ fontFamily: 'DM Sans, sans-serif' }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info panel — bottom-left */}
      <div
        className="absolute bottom-8 left-4 z-10 px-3.5 py-2.5 rounded-xl"
        style={{
          background: 'rgba(250,247,242,0.92)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 2px 10px rgba(42,36,32,0.10)',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-coral/30 border-t-coral rounded-full animate-spin" />
            <span className="text-[11px] text-ink-muted">Loading locations...</span>
          </div>
        ) : visibleCount === 0 ? (
          <p className="text-[11px] text-ink-muted">No locations to show</p>
        ) : (
          <>
            <p className="text-[13px] font-semibold text-ink leading-tight">
              {visibleCount} location{visibleCount !== 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-ink-muted mt-0.5">
              across {siteNames.size} site{siteNames.size !== 1 ? 's' : ''}
            </p>
          </>
        )}

        {/* Legend */}
        <div className="mt-2 pt-2 border-t border-border-light flex flex-col gap-1">
          <LegendItem color="#CF6A4C" label="Interview / Photo" />
          <LegendItem color="#C4844A" label="Field Note" />
          <LegendItem color="#6B8C7A" label="Location / Voice" />
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="absolute bottom-8 left-1/2 z-20 px-4 py-2 rounded-xl text-[12px] font-medium transition-all"
          style={{
            transform: 'translateX(-50%)',
            background: toast.type === 'success' ? 'rgba(42,36,32,0.88)' : 'rgba(207,106,76,0.92)',
            color: 'white',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.20)',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && locations.length === 0 && !activeNoteId && mapReady && (
        <MapEmptyState />
      )}

      {/* Popup CSS injection */}
      <PopupStyles />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Popup HTML builder
// ---------------------------------------------------------------------------

function buildPopupHTML(loc: MapLocation): string {
  const label  = noteTypeLabel(loc);
  const name   = loc.location_name ?? loc.name;
  const counts = loc.note_count > 0
    ? `<p style="font-size:11px;color:#9A8B82;margin:2px 0 0">${loc.note_count} note${loc.note_count !== 1 ? 's' : ''}</p>`
    : '';
  const openBtn = loc.source_type === 'note'
    ? `<button id="open-note-${loc.id}" style="
        margin-top:8px;
        width:100%;
        padding:5px 0;
        border-radius:6px;
        background:#CF6A4C;
        color:white;
        border:none;
        font-size:11px;
        font-weight:600;
        cursor:pointer;
        font-family:'DM Sans',sans-serif;
      ">Open note</button>`
    : '';

  return `
    <div style="font-family:'DM Sans',sans-serif;padding:2px 0;">
      <p style="font-family:'Lora',serif;font-size:13.5px;font-weight:600;color:#2A2420;margin:0 0 3px;line-height:1.25;">${name}</p>
      <p style="font-size:11.5px;color:#6B5E55;margin:0;">${label}</p>
      ${counts}
      <p style="font-size:10px;color:#C4B8B0;margin:4px 0 0;">${loc.lat.toFixed(4)}°N, ${loc.lng.toFixed(4)}°E</p>
      ${openBtn}
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Popup styles injected once into <head>
// ---------------------------------------------------------------------------

function PopupStyles() {
  useEffect(() => {
    const id = 'archivemind-popup-styles';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      .archivemind-popup .mapboxgl-popup-content {
        background: rgba(250,247,242,0.97);
        border: 1px solid rgba(42,36,32,0.10);
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(42,36,32,0.14);
        padding: 12px 14px;
        min-width: 160px;
      }
      .archivemind-popup .mapboxgl-popup-tip {
        border-top-color: rgba(250,247,242,0.97);
      }
      .archivemind-popup .mapboxgl-popup-close-button {
        color: #9A8B82;
        font-size: 16px;
        padding: 4px 6px;
        top: 2px;
        right: 2px;
      }
      .archivemind-popup .mapboxgl-popup-close-button:hover {
        color: #CF6A4C;
        background: transparent;
      }
      .mapboxgl-ctrl-top-right {
        top: 16px !important;
        right: 16px !important;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-[10.5px] text-ink-muted font-medium" style={{ fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </span>
    </div>
  );
}

function MapEmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
            Add locations to your notes to see them on the map
          </h2>
          <p className="text-[13px] text-ink-muted leading-relaxed">
            Open a note, then click anywhere on the map to set its location. Reverse geocoding will name the spot automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
