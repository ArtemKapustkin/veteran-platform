"use client";

import { Map, type MapRef } from "react-map-gl/maplibre";
import { forwardRef, type ReactNode } from "react";

// `liberty` is OpenFreeMap's full-color OSM Liberty style — soft green parks,
// pastel water, gentle road tints. Was previously `positron` (greyscale-ish);
// liberty gives the map more life without drowning out the colored event pins.
export const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export interface MapCanvasProps {
  longitude?: number;
  latitude?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

export const MapCanvas = forwardRef<MapRef, MapCanvasProps>(function MapCanvas(
  {
    longitude = 30.5234,
    latitude = 50.4501,
    zoom = 12.2,
    minZoom = 10,
    maxZoom = 17,
    interactive = true,
    className,
    children,
  },
  ref,
) {
  return (
    <div className={className} style={{ position: "absolute", inset: 0 }}>
      <Map
        ref={ref}
        initialViewState={{ longitude, latitude, zoom }}
        minZoom={minZoom}
        maxZoom={maxZoom}
        mapStyle={MAP_STYLE}
        attributionControl={false}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        scrollZoom={interactive}
        boxZoom={interactive}
        doubleClickZoom={interactive}
        dragPan={interactive}
        keyboard={interactive}
        touchZoomRotate={interactive}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Map>
    </div>
  );
});
