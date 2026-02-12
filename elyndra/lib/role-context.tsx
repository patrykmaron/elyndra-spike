"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Role } from "@/lib/db/types";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
  homeId: string | null;
  homeName: string | null;
}

interface RoleContextValue {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser) => void;
  users: CurrentUser[];
  setUsers: (users: CurrentUser[]) => void;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const STORAGE_KEY = "elyndra-current-user";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<CurrentUser[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setCurrentUserState(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setCurrentUser = (user: CurrentUser) => {
    setCurrentUserState(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  };

  if (!mounted) {
    return null;
  }

  return (
    <RoleContext.Provider
      value={{ currentUser, setCurrentUser, users, setUsers }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
