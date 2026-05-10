"use client";

import {
  Map,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { KYIV_CENTER } from "@/data/events";

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
  /**
   * Click on the map canvas (background, not a marker). Used by the
   * /add-event location picker to drop / move a marker on tap.
   */
  onClick?: (e: MapLayerMouseEvent) => void;
}

export const MapCanvas = forwardRef<MapRef, MapCanvasProps>(function MapCanvas(
  {
    longitude: lonIn,
    latitude: latIn,
    zoom = 12.2,
    minZoom = 10,
    maxZoom = 17,
    interactive = true,
    className,
    children,
    onClick,
  },
  forwardedRef,
) {
  // Explicit `null` from callers bypasses JS default params; MapLibre then
  // throws "Expected value to be of type number, but found null".
  const longitude =
    lonIn != null && Number.isFinite(lonIn) ? lonIn : KYIV_CENTER.lng;
  const latitude =
    latIn != null && Number.isFinite(latIn) ? latIn : KYIV_CENTER.lat;

  const containerRef = useRef<HTMLDivElement>(null);
  const internalMapRef = useRef<MapRef | null>(null);

  const setMapRef = useCallback(
    (instance: MapRef | null) => {
      internalMapRef.current = instance;
      if (typeof forwardedRef === "function") {
        forwardedRef(instance);
      } else if (forwardedRef) {
        forwardedRef.current = instance;
      }
    },
    [forwardedRef],
  );

  // MapLibre measures its canvas once at mount and only repaints on view
  // changes. When the embed lives below the fold (event detail "Локація"
  // map) the canvas can land 0×0 / mismeasured for its first frame and
  // stay blank until the user pans. We patch this two ways:
  //   1) ResizeObserver — re-`resize()` whenever the container box settles
  //      (late layout, viewport switch, sticky reflow).
  //   2) IntersectionObserver — force a repaint as soon as the embed
  //      scrolls into view. With a 200px rootMargin we trigger just before
  //      it enters the viewport so the user never sees a blank frame.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const repaint = () => {
      const m = internalMapRef.current;
      if (!m) return;
      m.resize();
      m.triggerRepaint();
    };

    const cleanups: Array<() => void> = [];

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(repaint);
      ro.observe(node);
      cleanups.push(() => ro.disconnect());
    }

    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) repaint();
        },
        { rootMargin: "200px" },
      );
      io.observe(node);
      cleanups.push(() => io.disconnect());
    }

    return () => cleanups.forEach((c) => c());
  }, []);

  const handleLoad = useCallback(() => {
    const m = internalMapRef.current;
    if (!m) return;
    m.resize();
    m.triggerRepaint();
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "absolute", inset: 0 }}
    >
      <Map
        ref={setMapRef}
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
        onLoad={handleLoad}
        onClick={onClick}
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Map>
    </div>
  );
});
