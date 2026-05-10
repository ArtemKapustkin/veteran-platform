"use client";

import { useEffect, useRef, useState } from "react";
import { communitiesApi } from "@/lib/api";
import type {
  ApiError,
  Community,
  CommunityPage,
} from "@/lib/api";
import type { CommunityListParams } from "@/lib/api/communities";

interface ListResult {
  communities: Community[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface ListInternalState {
  communities: Community[];
  loading: boolean;
  error: string | null;
}

const INITIAL_LIST: ListInternalState = {
  communities: [],
  loading: true,
  error: null,
};

/**
 * Fetch the public communities list. Mirrors `useEvents` — naive caching
 * (refresh on remount), aborts in-flight requests on unmount/param change,
 * and ignores stale responses if the effect re-runs mid-fetch.
 *
 * State updates are deferred via `.then`/`.catch` (microtask boundary) to
 * comply with React 19's `react-hooks/set-state-in-effect` rule.
 */
export function useCommunities(params?: CommunityListParams): ListResult {
  const [state, setState] = useState<ListInternalState>(INITIAL_LIST);
  const [tick, setTick] = useState(0);
  const paramsKey = JSON.stringify(params ?? {});

  const reqRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const reqId = ++reqRef.current;

    communitiesApi
      .list(params, controller.signal)
      .then((page: CommunityPage) => {
        if (reqRef.current !== reqId) return;
        setState({
          communities: page.items,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- params compared by JSON
  }, [paramsKey, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}

interface DetailResult {
  community: Community | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface DetailInternalState {
  community: Community | null;
  loading: boolean;
  error: string | null;
}

const INITIAL_DETAIL: DetailInternalState = {
  community: null,
  loading: true,
  error: null,
};

/**
 * Fetch a single community by UUID. `null` while loading or on 404 — the
 * caller renders its own not-found state.
 */
export function useCommunity(id: string | null | undefined): DetailResult {
  const [state, setState] = useState<DetailInternalState>(INITIAL_DETAIL);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) {
      Promise.resolve().then(() => {
        setState({ community: null, loading: false, error: null });
      });
      return;
    }
    const controller = new AbortController();
    communitiesApi
      .get(id, controller.signal)
      .then((c) => {
        setState({ community: c, loading: false, error: null });
      })
      .catch((e: ApiError | Error) => {
        if (controller.signal.aborted) return;
        setState({ community: null, loading: false, error: e.message });
      });
    return () => controller.abort();
  }, [id, tick]);

  return { ...state, refresh: () => setTick((t) => t + 1) };
}
