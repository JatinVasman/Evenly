"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";
import { CURRENT_USER } from "@/lib/mockData";

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

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User>(CURRENT_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUserState(data.user);
          setIsAuthenticated(true);
          return;
        }
      }
      setIsAuthenticated(false);
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
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
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
      user: CURRENT_USER,
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
