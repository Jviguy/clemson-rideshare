"use client";

import { useRef, useEffect, memo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LatLng {
  lat: number;
  lng: number;
}

interface RideMapProps {
  origin: LatLng;
  destination: LatLng;
  routeGeometry?: [number, number][];
  className?: string;
}

function createMarkerEl(color: string) {
  const el = document.createElement("div");
  el.style.cssText = `
    width: 14px; height: 14px; border-radius: 50%;
    background: ${color}; border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.25); cursor: pointer;
  `;
  return el;
}

export const RideMap = memo(
  function RideMap({ origin, destination, routeGeometry, className = "" }: RideMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    const dataKey = `${origin.lat},${origin.lng},${destination.lat},${destination.lng},${routeGeometry?.length ?? 0}`;

    useEffect(() => {
      if (!containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = new maplibregl.Map({
          container: containerRef.current,
          style: {
            version: 8,
            sources: {
              "carto-voyager": {
                type: "raster",
                tiles: [
                  "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
                  "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
                  "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
                ],
                tileSize: 256,
                maxzoom: 20,
              },
            },
            layers: [
              {
                id: "carto-tiles",
                type: "raster",
                source: "carto-voyager",
                minzoom: 0,
                maxzoom: 20,
              },
            ],
          },
          center: [(origin.lng + destination.lng) / 2, (origin.lat + destination.lat) / 2],
          zoom: 8,
          attributionControl: false,
        });

        mapRef.current.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      }

      const map = mapRef.current;

      const setup = () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current = [];
        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getLayer("route-outline")) map.removeLayer("route-outline");
        if (map.getSource("route")) map.removeSource("route");

        // Markers
        const originMarker = new maplibregl.Marker({ element: createMarkerEl("#22c55e") })
          .setLngLat([origin.lng, origin.lat])
          .addTo(map);

        const destMarker = new maplibregl.Marker({ element: createMarkerEl("#F56600") })
          .setLngLat([destination.lng, destination.lat])
          .addTo(map);

        markersRef.current = [originMarker, destMarker];

        // Route line
        if (routeGeometry && routeGeometry.length > 0) {
          map.addSource("route", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: routeGeometry },
            },
          });

          // Outline for depth
          map.addLayer({
            id: "route-outline",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#c44d00", "line-width": 7, "line-opacity": 0.4 },
          });

          map.addLayer({
            id: "route-line",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#F56600", "line-width": 4, "line-opacity": 0.9 },
          });
        }

        // Fit bounds
        const bounds = new maplibregl.LngLatBounds();
        bounds.extend([origin.lng, origin.lat]);
        bounds.extend([destination.lng, destination.lat]);
        routeGeometry?.forEach((c) => bounds.extend(c));
        map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
      };

      if (map.loaded()) {
        setup();
      } else {
        map.once("load", setup);
      }

      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataKey]);

    useEffect(() => {
      return () => {
        markersRef.current.forEach((m) => m.remove());
        mapRef.current?.remove();
        mapRef.current = null;
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`h-64 w-full rounded-xl overflow-hidden ${className}`}
      />
    );
  },
  (prev, next) =>
    prev.origin.lat === next.origin.lat &&
    prev.origin.lng === next.origin.lng &&
    prev.destination.lat === next.destination.lat &&
    prev.destination.lng === next.destination.lng &&
    prev.routeGeometry?.length === next.routeGeometry?.length &&
    prev.className === next.className
);
