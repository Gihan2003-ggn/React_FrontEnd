import { Heart, Music2, Pause, Play, Shuffle, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { Player } from "../usePlayer";
import { formatTime } from "../utils";
import Cover from "./Cover";

interface Props {
  player: Player;
  isFav: boolean;
  onToggleFav: () => void;
  onOpenFull: () => void;
}

export default function PlayerBar({ player, isFav, onToggleFav, onOpenFull }: Props) {
  const { active, playing, progress, duration, volume, shuffle } = player;
  const total = duration || active?.duration || 0;

  return (
    <footer className="player">
      <div className="now-playing">
        {active ? (
          <>
            <button className="cover-btn" onClick={onOpenFull} title="Open full screen">
              <Cover src={active.coverUrl} />
            </button>
            <div>
              <b>{active.title}</b>
              <small>{active.artist}</small>
            </div>
            <button className={`icon-btn ${isFav ? "liked" : ""}`} onClick={onToggleFav} title="Favourite">
              <Heart size={17} fill={isFav ? "currentColor" : "none"} />
            </button>
          </>
        ) : (
          <>
            <div className="mini-cover"><Music2 size={20} /></div>
            <div>
              <b>Nothing playing</b>
              <small>Choose a song to begin</small>
            </div>
          </>
        )}
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button
            className={`icon-btn ${shuffle ? "liked" : ""}`}
            onClick={() => player.setShuffle(!shuffle)}
            title="Shuffle"
          >
            <Shuffle size={16} />
          </button>
          <button className="icon-btn" onClick={player.prev} title="Previous"><SkipBack size={19} /></button>
          <button className="play-button" onClick={player.toggle} title={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button className="icon-btn" onClick={player.next} title="Next"><SkipForward size={19} /></button>
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
      </div>

      <div className="player-extras">
        <Volume2 size={18} />
        <input
          type="range"
          min="0"
          max="1"
          step=".01"
          value={volume}
          onChange={(e) => player.setVolume(Number(e.target.value))}
          aria-label="Volume"
        />
      </div>
    </footer>
  );
}
