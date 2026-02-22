import { useMemo } from 'react';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEntityNotes } from '../../hooks/useEntities';
import type { Entity } from '../../types';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface MiniMapProps {
  entity?: Entity | null;
}

export default function MiniMap({ entity }: MiniMapProps) {
  const { data: notes } = useEntityNotes(entity?.id ?? null);

  // Gather locations from related notes
  const pins = useMemo(() => {
    if (!notes) return [];
    return notes
      .filter(n => n.location_name)
      .map((n, i) => ({
        id: n.id,
        label: n.location_name!,
        // Pseudo-coords for demo
        lat: 7.3 + Math.sin(i * 1.5) * 0.3,
        lng: 80.6 + Math.cos(i * 2.1) * 0.4,
      }));
  }, [notes]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex items-center justify-center h-[140px] bg-sand/30 rounded-lg text-ink-ghost text-[11px]">
        Map requires VITE_MAPBOX_TOKEN
      </div>
    );
  }

  return (
    <div className="h-[140px] rounded-lg overflow-hidden border border-border-light">
      <Map
        initialViewState={{
          latitude: 7.3,
          longitude: 80.6,
          zoom: 7,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        interactive={false}
      >
        {pins.map((pin) => (
          <div key={pin.id} style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            {/* Simple dots — in production use react-map-gl Marker */}
          </div>
        ))}
      </Map>
    </div>
  );
}
