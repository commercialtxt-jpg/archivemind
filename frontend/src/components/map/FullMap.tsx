import { useMemo } from 'react';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEntities } from '../../hooks/useEntities';
import MapPins from './MapPins';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12';

export default function FullMap() {
  const { data: locationsResp } = useEntities('location');
  const { data: personsResp } = useEntities('person');
  const locations = useMemo(() => locationsResp?.data ?? [], [locationsResp]);
  const persons = useMemo(() => personsResp?.data ?? [], [personsResp]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-parchment text-ink-muted gap-3">
        <span className="text-4xl">🗺</span>
        <p className="text-sm font-medium">Map View</p>
        <p className="text-[12px] text-ink-ghost max-w-[300px] text-center">
          Set <code className="font-mono text-[11px] bg-sand px-1 py-0.5 rounded">VITE_MAPBOX_TOKEN</code> in your .env file to enable Mapbox GL maps
        </p>
      </div>
    );
  }

  return (
    <Map
      initialViewState={{
        latitude: 7.3,
        longitude: 80.6,
        zoom: 8,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle={MAP_STYLE}
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <MapPins entities={locations} color="var(--color-coral)" />
      <MapPins entities={persons} color="var(--color-amber)" />
    </Map>
  );
}
