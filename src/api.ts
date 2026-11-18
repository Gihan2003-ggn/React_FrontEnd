import type { AuthResult, Song, User } from "./types";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace(/\/$/, "");

export const TOKEN_KEY = "sonora_token";

let authToken = localStorage.getItem(TOKEN_KEY) || "";
export const setAuthToken = (token: string): void => {
  authToken = token;
};

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers || {})
      }
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError("Cannot reach the server. Is the backend running on port 5000?", 0);
  }

  const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
  if (!res.ok) throw new ApiError(json.message || `Request failed (${res.status})`, res.status);
  return json.data as T;
}

export const api = {
  trending: () => request<Song[]>("/songs/trending"),
  search: (q: string, signal?: AbortSignal) =>
    request<Song[]>(`/songs/search?q=${encodeURIComponent(q)}`, { signal }),

  register: (body: { name: string; email: string; password: string }) =>
    request<AuthResult>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<User>("/auth/me"),

  favorites: () => request<Song[]>("/favorites"),
  addFavorite: (song: Song) => request<Song[]>("/favorites", { method: "POST", body: JSON.stringify(song) }),
  removeFavorite: (songId: string) =>
    request<Song[]>(`/favorites/${encodeURIComponent(songId)}`, { method: "DELETE" })
};
