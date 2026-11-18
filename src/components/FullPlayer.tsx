import { useEffect } from "react";
import { ChevronDown, Heart, Pause, Play, Shuffle, SkipBack, SkipForward, X } from "lucide-react";
import type { Player } from "../usePlayer";
import type { Song } from "../types";
import { formatTime, songBadge } from "../utils";
import Cover from "./Cover";

interface Props {
  song: Song;
  player: Player;
  isFav: boolean;
  onToggleFav: () => void;
  onClose: () => void;
}

export default function FullPlayer({ song, player, isFav, onToggleFav, onClose }: Props) {
  const { playing, progress, duration, shuffle } = player;
  const total = duration || song.duration || 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="full-player">
      <div className="full-bg" style={{ backgroundImage: `url("${song.coverUrl}")` }} />
      <div className="full-inner">
        <div className="full-top">
          <button className="icon-btn" onClick={onClose} title="Minimize (Esc)">
            <ChevronDown size={28} />
          </button>
          <span>NOW PLAYING</span>
          <span className="full-top-spacer" />
        </div>

        {song.source === "youtube" ? (
          // The YouTube player (kept alive in App) is positioned over this box.
          <div id="yt-placeholder" className="yt-placeholder" />
        ) : (
          <Cover className={`full-cover ${playing ? "is-playing" : ""}`} src={song.coverUrl} />
        )}

        <div className="full-meta">
          <div>
            <h2>{song.title}</h2>
            <p>{song.artist}</p>
            <span className="genre-tag always">{songBadge(song)}</span>
          </div>
          <button className={`icon-btn ${isFav ? "liked" : ""}`} onClick={onToggleFav} title="Favourite">
            <Heart size={26} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="progress-line">
          <span>{formatTime(progress)}</span>
          <input
            type="range"
            min="0"
            max={total || 100}
            value={Math.min(progress, total || 100)}
            onChange={(e) => player.seek(Number(e.target.value))}
            aria-label="Seek"
          />
          <span>{formatTime(total)}</span>
        </div>

        <div className="full-controls">
          <button
            className={`icon-btn ${shuffle ? "liked" : ""}`}
            onClick={() => player.setShuffle(!shuffle)}
            title="Shuffle"
          >
            <Shuffle size={22} />
          </button>
          <button className="icon-btn" onClick={player.prev} title="Previous"><SkipBack size={30} /></button>
          <button className="play-button big" onClick={player.toggle} title={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
          </button>
          <button className="icon-btn" onClick={player.next} title="Next"><SkipForward size={30} /></button>
          <button className="icon-btn" onClick={onClose} title="Close"><X size={22} /></button>
        </div>
      </div>
    </div>
  );
}
