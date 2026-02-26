import { useCallback, useRef, useState } from 'react';

export interface GeoResult {
  lat: number;
  lng: number;
  locationName: string;
  gpsCoords: string;
}

export function useGeolocation() {
  const [result, setResult] = useState<GeoResult | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const requestLocation = useCallback(async () => {
    setIsLocating(true);
    setError(null);
    abortRef.current = false;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        });
      });

      if (abortRef.current) return;

      const { latitude: lat, longitude: lng } = position.coords;
      const gpsCoords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      // Reverse geocode via Mapbox
      let locationName = `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`;
      const token = import.meta.env.VITE_MAPBOX_TOKEN ?? '';
      if (token) {
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}&types=place,locality,region`
          );
          if (res.ok) {
            const geo = await res.json();
            if (geo.features?.length) {
              locationName = geo.features[0].place_name ?? locationName;
            }
          }
        } catch {
          // Reverse geocoding failed — keep coordinate-based name
        }
      }

      if (abortRef.current) return;

      const geo: GeoResult = { lat, lng, locationName, gpsCoords };
      setResult(geo);
      setIsLocating(false);
      return geo;
    } catch (err) {
      if (abortRef.current) return;
      const msg =
        err instanceof GeolocationPositionError
          ? err.code === 1
            ? 'Location permission denied'
            : err.code === 2
              ? 'Location unavailable'
              : 'Location request timed out'
          : 'Failed to get location';
      setError(msg);
      setIsLocating(false);
      return undefined;
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current = true;
    setResult(null);
    setError(null);
    setIsLocating(false);
  }, []);

  return { result, isLocating, error, requestLocation, clear };
}
