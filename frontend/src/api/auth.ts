import { api, tokens } from "./client";
import type { Role } from "@/store/auth";

export interface MeResponse {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ access: string; refresh: string }>(
    "/auth/login/",
    { email, password }
  );
  tokens.set(data.access, data.refresh);
  return data;
}

export async function fetchMe() {
  const { data } = await api.get<MeResponse>("/auth/me/");
  return data;
}

export function logout() {
  tokens.clear();
}
