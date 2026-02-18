"use client";

import Cookies from "js-cookie";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { mutate } from "swr";
import { api } from "@/lib/api";
import { AuthUser } from "@/lib/types";

interface AuthContextType {
  isAuthed: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const { data } = await api.get<AuthUser>("/auth/me");
    setUser(data);
    setIsAuthed(true);
  }, []);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchProfile()
      .catch(() => {
        Cookies.remove("token");
        setUser(null);
        setIsAuthed(false);
      })
      .finally(() => setIsLoading(false));
  }, [fetchProfile]);

  const login = useCallback(
    async (token: string) => {
      Cookies.set("token", token, { expires: 7 });
      setIsLoading(true);
      try {
        await fetchProfile();
      } catch (error) {
        Cookies.remove("token");
        setUser(null);
        setIsAuthed(false);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [fetchProfile]
  );

  const logout = useCallback(() => {
    Cookies.remove("token");
    setUser(null);
    setIsAuthed(false);
    // Clear SWR caches related to auth and events so UI reflects logged-out state
    try {
      mutate("/auth/me", undefined, false);
      mutate("/events", undefined, false);
    } catch (e) {
      // ignore mutate errors
    }
  }, []);


  const refreshUser = useCallback(async () => {
    try {
      await fetchProfile();
    } catch (error) {
      Cookies.remove("token");
      setUser(null);
      setIsAuthed(false);
      throw error;
    }
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ isAuthed, isLoading, user, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
