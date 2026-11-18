"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { clientCache, prefetchAppData } from "@/lib/clientCache";

const DEFAULT_EMPTY_USER: User = {
  id: "",
  name: "User",
  username: "",
  email: "",
  image: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

interface UserContextType {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  updateUser: (updates: Partial<User>) => void;
  updateProfileImage: (imageUrl: string) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = "evenly_user_profile_v1";

const getInitialUser = (): { user: User; isAuthenticated: boolean } => {
  if (typeof window === "undefined") {
    return { user: DEFAULT_EMPTY_USER, isAuthenticated: false };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.id && parsed.username) {
        return { user: parsed, isAuthenticated: true };
      }
    }
  } catch {
    // ignore storage parsing errors
  }
  return { user: DEFAULT_EMPTY_USER, isAuthenticated: false };
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(() => getInitialUser());
  const [user, setUserState] = useState<User>(initial.user);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initial.isAuthenticated);
  const [isLoading, setIsLoading] = useState<boolean>(!initial.isAuthenticated);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserState(data.user);
          setIsAuthenticated(true);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
            } catch {
              // ignore
            }
          }
          // Prefetch other tabs in background for instant switching
          prefetchAppData();
          return;
        }
      }
      // If unauthorized, clear local session state
      setIsAuthenticated(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn("Failed to check auth session:", e);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // If already authenticated from cache, immediately trigger prefetch
  useEffect(() => {
    if (isAuthenticated) {
      prefetchAppData();
    }
  }, [isAuthenticated]);

  const setUser = (newUser: User) => {
    setUserState(newUser);
    setIsAuthenticated(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
      } catch (e) {
        console.warn("Failed to store user profile:", e);
      }
    }
    prefetchAppData();
  };

  const updateUser = (updates: Partial<User>) => {
    setUserState((prev) => {
      const updated = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (e) {
          console.warn("Failed to update user profile in storage:", e);
        }
      }
      return updated;
    });
  };

  const updateProfileImage = (imageUrl: string) => {
    updateUser({ image: imageUrl });
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout request error:", e);
    }
    setUserState(DEFAULT_EMPTY_USER);
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    clientCache.invalidate();
    router.push("/login");
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        updateUser,
        updateProfileImage,
        setUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    return {
      user: DEFAULT_EMPTY_USER,
      isAuthenticated: false,
      isLoading: false,
      updateUser: () => {},
      updateProfileImage: () => {},
      setUser: () => {},
      logout: async () => {},
      refreshUser: async () => {},
    };
  }
  return context;
}
