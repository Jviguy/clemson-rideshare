"use client";

import { useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface LatLng {
  lat: number;
  lng: number;
}

interface RideMapProps {
  origin: LatLng;
  destination: LatLng;
  routeGeometry?: [number, number][]; // [lng, lat] coordinate pairs
  className?: string;
}

export function RideMap({
  origin,
  destination,
  routeGeometry,
  className = "",
}: RideMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [
        (origin.lng + destination.lng) / 2,
        (origin.lat + destination.lat) / 2,
      ],
      zoom: 10,
    });

    mapRef.current = map;

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      // Origin marker (green)
      const originEl = document.createElement("div");
      originEl.style.width = "16px";
      originEl.style.height = "16px";
      originEl.style.borderRadius = "50%";
      originEl.style.backgroundColor = "#22c55e";
      originEl.style.border = "3px solid #fff";
      originEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";

      new maplibregl.Marker({ element: originEl })
        .setLngLat([origin.lng, origin.lat])
        .setPopup(new maplibregl.Popup({ offset: 12 }).setText("Origin"))
        .addTo(map);

      // Destination marker (red)
      const destEl = document.createElement("div");
      destEl.style.width = "16px";
      destEl.style.height = "16px";
      destEl.style.borderRadius = "50%";
      destEl.style.backgroundColor = "#ef4444";
      destEl.style.border = "3px solid #fff";
      destEl.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";

      new maplibregl.Marker({ element: destEl })
        .setLngLat([destination.lng, destination.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12 }).setText("Destination")
        )
        .addTo(map);

      // Draw route line if geometry is provided
      if (routeGeometry && routeGeometry.length > 0) {
        map.addSource("route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: routeGeometry,
            },
          },
        });

        map.addLayer({
          id: "route-line",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#F56600", // Clemson orange
            "line-width": 4,
            "line-opacity": 0.8,
          },
        });
      }

      // Fit bounds to show both markers (and route)
      const bounds = new maplibregl.LngLatBounds();
      bounds.extend([origin.lng, origin.lat]);
      bounds.extend([destination.lng, destination.lat]);

      if (routeGeometry) {
        for (const coord of routeGeometry) {
          bounds.extend(coord);
        }
      }

      map.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [origin, destination, routeGeometry]);

  return (
    <div
      ref={mapContainerRef}
      className={`h-64 w-full rounded-lg overflow-hidden ${className}`}
    />
  );
}
