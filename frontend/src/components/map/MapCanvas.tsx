"use client";

import { Map, type MapRef } from "react-map-gl/maplibre";
import { forwardRef, type ReactNode } from "react";

export const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

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
