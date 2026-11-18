import type { Song } from "./types";

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export const songBadge = (song: Song): string => (song.isFull ? "Full song" : "30s preview");

// Shown when a cover image is missing or fails to load
export const FALLBACK_COVER =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a18aff"/><stop offset="1" stop-color="#e69bd0"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/><text x="50" y="62" font-size="40" text-anchor="middle" fill="white" fill-opacity=".85">♪</text></svg>`
  );
