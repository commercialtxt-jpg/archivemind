import { useCallback } from 'react';
import { Marker, Popup } from 'react-map-gl/mapbox';
import { useState } from 'react';
import type { Entity } from '../../types';

interface MapPinProps {
  entities: Entity[];
  color?: string;
}

export default function MapPins({ entities, color = 'var(--color-coral)' }: MapPinProps) {
  const [popup, setPopup] = useState<Entity | null>(null);

  const handleClick = useCallback((entity: Entity) => {
    setPopup(entity);
  }, []);

  // Filter to entities that have some kind of location data
  // For now we use a simple heuristic - entity type 'location'
  // In production, these would have lat/lng from the notes
  return (
    <>
      {entities.map((entity, i) => {
        // Generate pseudo-positions based on index for demo
        // In production, use entity.location_lat/lng from related notes
        const lat = 7.0 + (i % 5) * 0.3 + Math.sin(i * 2.1) * 0.5;
        const lng = 80.0 + Math.floor(i / 5) * 0.4 + Math.cos(i * 1.7) * 0.6;

        return (
          <Marker key={entity.id} latitude={lat} longitude={lng} anchor="center" onClick={() => handleClick(entity)}>
            <div
              className="rounded-full border-2 border-white cursor-pointer"
              style={{
                width: 12,
                height: 12,
                backgroundColor: color,
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </Marker>
        );
      })}

      {popup && (
        <Popup
          latitude={7.0 + (entities.indexOf(popup) % 5) * 0.3 + Math.sin(entities.indexOf(popup) * 2.1) * 0.5}
          longitude={80.0 + Math.floor(entities.indexOf(popup) / 5) * 0.4 + Math.cos(entities.indexOf(popup) * 1.7) * 0.6}
          anchor="bottom"
          onClose={() => setPopup(null)}
          closeOnClick={false}
        >
          <div className="text-[12px] text-ink font-medium p-1">
            <p className="font-serif font-semibold">{popup.name}</p>
            <p className="text-ink-muted text-[10px]">{popup.entity_type}</p>
          </div>
        </Popup>
      )}
    </>
  );
}
