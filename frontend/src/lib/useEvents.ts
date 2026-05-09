"use client";

import { useEffect, useRef, useState } from "react";
import { eventsApi } from "@/lib/api";
import type { ApiError, EventListFilters } from "@/lib/api";
import { apiEventToAppEvent } from "@/lib/api/mappers";
import type { AppEvent } from "@/data/events";

interface ListResult {
  events: AppEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface ListInternalState {
  events: AppEvent[];
  loading: boolean;
  error: string | null;
}

const INITIAL_LIST: ListInternalState = {
  events: [],
  loading: true,
  error: null,
};

/**
 * Fetch the public events list and convert each entry into an `AppEvent`.
 * Re-runs whenever the filter signature changes. The hook is intentionally
 * dependency-free (no react-query/swr) to keep the bundle small — caching
 * is naive: a refresh on remount.
 *
 * State updates are deferred into `.then`/`.catch` callbacks (microtask
 * boundary) to satisfy React 19's `react-hooks/set-state-in-effect` rule
 * — synchronous setState inside an effect is no longer allowed.
 */
export function useEvents(filters?: EventListFilters): ListResult {
  const [state, setState] = useState<ListInternalState>(INITIAL_LIST);
  const [tick, setTick] = useState(0);
  const filtersKey = JSON.stringify(filters ?? {});

  // Track the last in-flight request so we can ignore stale responses if
  // the component re-runs the effect mid-fetch.
  const reqRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const reqId = ++reqRef.current;

    eventsApi
      .list(filters, controller.signal)
      .then((page) => {
        if (reqRef.current !== reqId) return;
        setState({
          events: page.items.map(apiEventToAppEvent),
          loading: false,
          error: null,
        });
      })
      .catch((e: ApiError | Error) => {
        if (controller.signal.aborted) return;
        if (reqRef.current !== reqId) return;
        setState((s) => ({ ...s, loading: false, error: e.message }));
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filters compared by JSON
  }, [filtersKey, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}

interface DetailResult {
  event: AppEvent | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface DetailInternalState {
  event: AppEvent | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_DETAIL: DetailInternalState = {
  event: null,
  loading: true,
  error: null,
};

/**
 * Fetch a single event by UUID. Returns `null` while loading or when the
 * id resolves to a 404 (the screen renders its own not-found UI).
 */
export function useEvent(id: string | null | undefined): DetailResult {
  const [state, setState] = useState<DetailInternalState>(INITIAL_DETAIL);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      // No id → settle into "loaded with no event" via microtask so we
      // don't trip the synchronous setState-in-effect rule.
      Promise.resolve().then(() => {
        setState({ event: null, loading: false, error: null });
      });
      return;
    }
    const controller = new AbortController();
    eventsApi
      .get(id, controller.signal)
      .then((ev) => {
        setState({
          event: apiEventToAppEvent(ev),
          loading: false,
          error: null,
        });
      })
      .catch((e: ApiError | Error) => {
        if (controller.signal.aborted) return;
        setState({ event: null, loading: false, error: e.message });
      });
    return () => controller.abort();
  }, [id, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
