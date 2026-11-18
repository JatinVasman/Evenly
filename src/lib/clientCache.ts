"use client";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

// Default cache TTL: 5 minutes (stale-while-revalidate will still refresh silently in the background)
const DEFAULT_TTL_MS = 5 * 60 * 1000;

export const clientCache = {
  get<T>(key: string, maxAgeMs = DEFAULT_TTL_MS): T | null {
    // 1. In-memory check (fastest, instant synchronous 0ms)
    const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry && Date.now() - memEntry.timestamp < maxAgeMs) {
      return memEntry.data;
    }

    // 2. LocalStorage check (persists across page reloads and app launches)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`evenly_cache_${key}`);
        if (stored) {
          const parsed = JSON.parse(stored) as CacheEntry<T>;
          if (Date.now() - parsed.timestamp < maxAgeMs) {
            memoryCache.set(key, parsed);
            return parsed.data;
          }
        }
      } catch {
        // Ignore storage exceptions
      }
    }

    return null;
  },

  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    memoryCache.set(key, entry as CacheEntry<unknown>);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`evenly_cache_${key}`, JSON.stringify(entry));
      } catch {
        // Ignore quota exceptions
      }
    }
  },

  invalidate(keyPrefix?: string): void {
    if (!keyPrefix) {
      memoryCache.clear();
      if (typeof window !== "undefined") {
        try {
          const keys = Object.keys(localStorage).filter((k) =>
            k.startsWith("evenly_cache_")
          );
          keys.forEach((k) => localStorage.removeItem(k));
        } catch {
          // Ignore
        }
      }
      return;
    }

    for (const k of Array.from(memoryCache.keys())) {
      if (k.startsWith(keyPrefix)) {
        memoryCache.delete(k);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const keys = Object.keys(localStorage).filter((k) =>
          k.startsWith(`evenly_cache_${keyPrefix}`)
        );
        keys.forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
  },
};

/**
 * Prefetch core application data in parallel in the background
 * once user is logged in, so switching tabs is instant with zero loading screens.
 */
export async function prefetchAppData(): Promise<void> {
  if (typeof window === "undefined") return;

  const endpoints = [
    "/api/dashboard",
    "/api/friends",
    "/api/groups",
    "/api/activity",
  ];

  for (const endpoint of endpoints) {
    // Only prefetch if not already fresh in memory
    if (!clientCache.get(endpoint)) {
      fetch(endpoint)
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            clientCache.set(endpoint, data);
          }
        })
        .catch(() => {
          // Fail silently in background
        });
    }
  }
}
