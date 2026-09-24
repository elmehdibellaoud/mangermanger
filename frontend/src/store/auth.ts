import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "CLIENT" | "SERVEUR" | "CUISINIER" | "GERANT";

interface AuthUser {
  id: number;
  email: string;
  role: Role;
  firstName?: string;
}

interface AuthState {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "mm.auth" }
  )
);
