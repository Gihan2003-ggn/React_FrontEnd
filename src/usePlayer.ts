import { RefObject, SyntheticEvent, useCallback, useEffect, useRef, useState } from "react";
import type { Song } from "./types";
import { loadYouTubeApi, YT_STATE, YTPlayer } from "./youtube";

interface Options {
  audioRef: RefObject<HTMLAudioElement>; // <audio> for jamendo / iTunes songs
  ytElementRef: RefObject<HTMLDivElement>; // element the YouTube iframe replaces
  onError: (message: string) => void;
}

// One player controller for both engines:
//  - HTML <audio>      -> Jamendo full songs + iTunes 30s previews
//  - YouTube IFrame    -> full songs from YouTube
export function usePlayer({ audioRef, ytElementRef, onError }: Options) {
  const [queue, setQueue] = useState<Song[]>([]);
  const [active, setActive] = useState<Song | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);

  const ytPlayer = useRef<YTPlayer | null>(null);
  const ytPromise = useRef<Promise<YTPlayer> | null>(null);
  const errorStreak = useRef(0);

  // Always-fresh values for callbacks that live longer than one render (YouTube events)
  const latest = useRef({ queue, active, shuffle, volume, onError });
  latest.current = { queue, active, shuffle, volume, onError };
  const jumpRef = useRef<(direction: number) => void>(() => {});

  const isYoutube = (song: Song | null): boolean => song?.source === "youtube" && !!song.videoId;

  // ---------- YouTube ----------
  const ensureYouTube = useCallback((): Promise<YTPlayer> => {
    if (ytPromise.current) return ytPromise.current;

    const promise = loadYouTubeApi().then(
      (YT) =>
        new Promise<YTPlayer>((resolve, reject) => {
          const element = ytElementRef.current;
          if (!element) {
            reject(new Error("Player element missing"));
            return;
          }
          const player: YTPlayer = new YT.Player(element, {
            width: "100%",
            height: "100%",
            playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: () => {
                ytPlayer.current = player;
                resolve(player);
              },
              onStateChange: (event) => {
                if (!isYoutube(latest.current.active)) return; // stale event from an old song
                if (event.data === YT_STATE.PLAYING) {
                  errorStreak.current = 0;
                  setPlaying(true);
                  const d = player.getDuration();
                  if (d > 0) setDuration(d);
                } else if (event.data === YT_STATE.PAUSED) {
                  setPlaying(false);
                } else if (event.data === YT_STATE.ENDED) {
                  setPlaying(false);
                  if (latest.current.queue.length > 1) jumpRef.current(1);
                  else setProgress(0);
                }
              },
              onError: () => {
                if (!isYoutube(latest.current.active)) return;
                errorStreak.current += 1;
                latest.current.onError("This video can't be played here (the owner disabled embedding).");
                const { queue: q } = latest.current;
                if (q.length > 1 && errorStreak.current < q.length) jumpRef.current(1); // skip it
                else setPlaying(false);
              }
            }
          });
        })
    );
    promise.catch(() => {
      ytPromise.current = null; // allow a retry next time
    });
    ytPromise.current = promise;
    return promise;
  }, [ytElementRef]);

  // ---------- load the active song into the right engine ----------
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const audio = audioRef.current;
    setProgress(0);
    setDuration(active.duration || 0);

    if (active.source === "youtube" && active.videoId) {
      audio?.pause();
      ensureYouTube()
        .then((player) => {
          if (cancelled) return;
          player.setVolume(Math.round(latest.current.volume * 100));
          player.loadVideoById(active.videoId as string);
        })
        .catch((e: Error) => latest.current.onError(e.message || "Could not start the YouTube player"));
    } else {
      ytPlayer.current?.stopVideo();
      if (audio) {
        audio.src = active.audioUrl;
        audio.play().catch(() => setPlaying(false));
      }
    }
    return () => {
      cancelled = true;
    };
  }, [active?.id]);

  // YouTube has no timeupdate event, so poll the position
  useEffect(() => {
    if (!isYoutube(active)) return;
    const timer = setInterval(() => {
      const player = ytPlayer.current;
      if (!player) return;
      try {
        setProgress(player.getCurrentTime() || 0);
        const d = player.getDuration();
        if (d > 0) setDuration(d);
      } catch {
        /* player not ready yet */
      }
    }, 500);
    return () => clearInterval(timer);
  }, [active?.id]);

  // ---------- controls ----------
  const toggle = () => {
    const song = latest.current.active;
    if (!song) return;
    if (isYoutube(song)) {
      const player = ytPlayer.current;
      if (!player) return;
      if (player.getPlayerState() === YT_STATE.PLAYING) player.pauseVideo();
      else player.playVideo();
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      if (audio.paused) audio.play().catch(() => {});
      else audio.pause();
    }
  };

  const seek = (seconds: number) => {
    setProgress(seconds);
    if (isYoutube(latest.current.active)) ytPlayer.current?.seekTo(seconds, true);
    else if (audioRef.current) audioRef.current.currentTime = seconds;
  };

  const setVolume = (value: number) => {
    setVolumeState(value);
    if (audioRef.current) audioRef.current.volume = value;
    ytPlayer.current?.setVolume(Math.round(value * 100));
  };

  const play = (song: Song, list: Song[] = []) => {
    setQueue(list.length ? list : [song]);
    errorStreak.current = 0;
    if (latest.current.active?.id === song.id) {
      if (!playing) toggle(); // same song: just resume
      return;
    }
    setActive(song);
  };

  const jump = (direction: number) => {
    const { active: current, queue: list, shuffle: shuffled } = latest.current;
    if (!current || !list.length) return;

    if (list.length === 1) {
      seek(0);
      if (!playing) toggle();
      return;
    }
    const index = list.findIndex((s) => s.id === current.id);
    let nextIndex: number;
    if (shuffled && direction > 0) {
      do {
        nextIndex = Math.floor(Math.random() * list.length);
      } while (nextIndex === index);
    } else {
      nextIndex = (index + direction + list.length) % list.length;
    }
    setActive(list[nextIndex]);
  };
  jumpRef.current = jump;

  const next = () => jump(1);
  const prev = () => {
    if (progress > 3) seek(0);
    else jump(-1);
  };

  // Keep the audio element volume in sync (e.g. first render)
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Lock screen / keyboard media keys
  useEffect(() => {
    if (!("mediaSession" in navigator) || !active) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: active.title,
      artist: active.artist,
      album: active.album,
      artwork: active.coverUrl ? [{ src: active.coverUrl, sizes: "480x360" }] : []
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", prev);
  });

  // Event handlers for the <audio> element
  const audioHandlers = {
    onPlay: () => {
      if (!isYoutube(latest.current.active)) setPlaying(true);
    },
    onPause: () => {
      if (!isYoutube(latest.current.active)) setPlaying(false);
    },
    onTimeUpdate: (e: SyntheticEvent<HTMLAudioElement>) => {
      if (!isYoutube(latest.current.active)) setProgress(e.currentTarget.currentTime);
    },
    onLoadedMetadata: (e: SyntheticEvent<HTMLAudioElement>) => {
      if (!isYoutube(latest.current.active)) setDuration(e.currentTarget.duration || 0);
    },
    onEnded: () => {
      if (isYoutube(latest.current.active)) return;
      if (latest.current.queue.length > 1) jumpRef.current(1);
      else setProgress(0);
    },
    onError: () => {
      if (!isYoutube(latest.current.active) && latest.current.active) {
        latest.current.onError("This song could not be played.");
      }
    }
  };

  return {
    active, queue, playing, progress, duration, volume, shuffle,
    setShuffle, setVolume, play, toggle, next, prev, seek, audioHandlers
  };
}

export type Player = ReturnType<typeof usePlayer>;
