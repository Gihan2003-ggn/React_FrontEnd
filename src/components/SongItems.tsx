import { AudioLines, Heart, Play } from "lucide-react";
import type { Song } from "../types";
import { formatTime, songBadge } from "../utils";
import Cover from "./Cover";

interface ItemProps {
  song: Song;
  list: Song[];
  isActive: boolean;
  isPlaying: boolean;
  isFav: boolean;
  onPlay: (song: Song, list: Song[]) => void;
  onToggleFav: (song: Song) => void;
}

export function TrackRow({
  song, list, index, isActive, isPlaying, isFav, onPlay, onToggleFav
}: ItemProps & { index: number }) {
  return (
    <div className={`song-row ${isActive ? "selected" : ""}`}>
      <div className="track-no">
        {isActive && isPlaying ? <AudioLines size={16} /> : String(index + 1).padStart(2, "0")}
      </div>
      <button className="track-main" onClick={() => onPlay(song, list)}>
        <Cover src={song.coverUrl} />
        <span>
          <b>{song.title}</b>
          <small>{song.artist}</small>
        </span>
      </button>
      <span className="genre-tag">{songBadge(song)}</span>
      <span className="plays">{formatTime(song.duration)}</span>
      <button
        className={`icon-btn like-btn ${isFav ? "liked" : ""}`}
        title={isFav ? "Remove from favourites" : "Add to favourites"}
        onClick={() => onToggleFav(song)}
      >
        <Heart size={17} fill={isFav ? "currentColor" : "none"} />
      </button>
      <button className="icon-btn" title="Play" onClick={() => onPlay(song, list)}>
        <Play size={16} />
      </button>
    </div>
  );
}

export function SongCard({ song, list, isFav, onPlay, onToggleFav }: ItemProps) {
  return (
    <article className="song-card">
      <div className="card-art" onClick={() => onPlay(song, list)}>
        <Cover src={song.coverUrl} />
        <button className="floating-play" aria-label="Play">
          <Play fill="currentColor" size={18} />
        </button>
        <span className="art-glow" />
      </div>
      <div className="card-info">
        <div>
          <b>{song.title}</b>
          <small>{song.artist}</small>
        </div>
        <button
          className={`icon-btn ${isFav ? "liked" : ""}`}
          title={isFav ? "Remove from favourites" : "Add to favourites"}
          onClick={() => onToggleFav(song)}
        >
          <Heart size={17} fill={isFav ? "currentColor" : "none"} />
        </button>
      </div>
    </article>
  );
}
