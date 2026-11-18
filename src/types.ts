export type SongSource = "youtube" | "jamendo" | "itunes";

export interface Song {
  id: string;
  source: SongSource;
  title: string;
  artist: string;
  album: string;
  genre: string;
  coverUrl: string;
  audioUrl: string; // direct audio file (jamendo / itunes); empty for youtube
  videoId?: string; // youtube only
  duration: number; // seconds
  isFull: boolean; // false = 30 second preview
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResult {
  token: string;
  user: User;
}

export type AuthMode = "login" | "register";
export type Page = "Home" | "Discover" | "Favourites";

export interface AuthValues {
  name: string;
  email: string;
  password: string;
  confirm: string;
}
