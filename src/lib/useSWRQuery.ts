"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { clientCache, prefetchAppData } from "./clientCache";

const inFlightRequests = new Map<string, Promise<unknown>>();

export interface SWRQueryOptions<T> {
  staleTimeMs?: number;
  initialData?: T;
  enabled?: boolean;
}

export function useSWRQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SWRQueryOptions<T> = {}
) {
  const { staleTimeMs = 30 * 1000, enabled = true } = options;

  // 1. Instant synchronous read from L1 memory or L2 localStorage
  const cached = useRef<T | null>(null);
  if (cached.current === null && typeof window !== "undefined") {
    cached.current = clientCache.get<T>(key, staleTimeMs) || options.initialData || null;
  }

  const [data, setData] = useState<T | null>(() => {
    if (typeof window === "undefined") return options.initialData || null;
    return clientCache.get<T>(key, staleTimeMs) || options.initialData || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => !data);
  const [isRevalidating, setIsRevalidating] = useState<boolean>(() => !!data);
  const [error, setError] = useState<Error | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(
    async (force = false) => {
      if (!enabled) return;

      // If not forcing and data was fresh in cache recently, avoid network spam
      if (!force) {
        const fresh = clientCache.get<T>(key, staleTimeMs);
        if (fresh && data) {
          setIsRevalidating(false);
          setIsLoading(false);
          return;
        }
      }

      setIsRevalidating(true);

      // In-flight request deduplication
      let promise = inFlightRequests.get(key) as Promise<T> | undefined;
      if (!promise) {
        promise = fetcherRef.current().then(
          (result) => {
            inFlightRequests.delete(key);
            clientCache.set(key, result);
            return result;
          },
          (err) => {
            inFlightRequests.delete(key);
            throw err;
          }
        );
        inFlightRequests.set(key, promise);
      }

      try {
        const freshData = await promise;
        setData(freshData);
        setError(null);
      } catch (err) {
        console.warn(`SWR background refresh failed for ${key}:`, err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
        setIsRevalidating(false);
      }
    },
    [key, enabled, staleTimeMs, data]
  );

  // Initial fetch / background revalidate on mount or key change
  useEffect(() => {
    revalidate();
  }, [revalidate]);

  // Window visibility & online event listeners for live background refresh
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    };

    const handleOnline = () => {
      revalidate(true);
    };

    const handleCacheInvalidated = (e: Event) => {
      const customEvent = e as CustomEvent<{ prefix?: string }>;
      if (!customEvent.detail?.prefix || key.startsWith(customEvent.detail.prefix)) {
        revalidate(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", handleOnline);
    window.addEventListener("evenly:cache_invalidated", handleCacheInvalidated);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("evenly:cache_invalidated", handleCacheInvalidated);
    };
  }, [key, enabled, revalidate]);

  const mutate = useCallback(
    (updater: T | ((current: T | null) => T), shouldRevalidate = true) => {
      setData((prev) => {
        const next = typeof updater === "function" ? (updater as (c: T | null) => T)(prev) : updater;
        clientCache.set(key, next);
        return next;
      });
      if (shouldRevalidate) {
        revalidate(true);
      }
    },
    [key, revalidate]
  );

  return {
    data,
    isLoading: isLoading && !data, // Only consider loading if we have zero cached data to display
    isRevalidating,
    error,
    mutate,
    refresh: () => revalidate(true),
  };
}

/**
 * Trigger cache invalidation across the app and notify all mounted SWR hooks
 */
export function invalidateCache(keyPrefix?: string) {
  clientCache.invalidate(keyPrefix);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("evenly:cache_invalidated", { detail: { prefix: keyPrefix } })
    );
    // Prefetch fresh core data in background for other tabs
    prefetchAppData();
  }
}
