import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowRight, AudioLines, ChevronDown, Compass, Disc3, Heart, Home,
  LogOut, Play, Search, UserRound, Check
} from "lucide-react";
import { api, ApiError, setAuthToken, TOKEN_KEY } from "./api";
import AuthModal from "./components/AuthModal";
import FullPlayer from "./components/FullPlayer";
import PlayerBar from "./components/PlayerBar";
import { SongCard, TrackRow } from "./components/SongItems";
import { usePlayer } from "./usePlayer";
import type { AuthMode, AuthValues, Page, Song, User } from "./types";
import { validateSearch } from "./validation";

const GENRES = ["pop", "rock", "hip hop", "dance", "chill", "jazz", "classical", "electronic"];

const PAGE_TITLES: Record<Exclude<Page, "Home">, [string, string]> = {
  Discover: ["Find your next", "favourite."],
  Favourites: ["Your", "favourites."]
};

export default function App() {
  // ---- account ----
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || "");
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  // ---- songs ----
  const [home, setHome] = useState<Song[]>([]);
  const [found, setFound] = useState<Song[]>([]);
  const [favs, setFavs] = useState<Song[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState<Page>("Home");

  // ---- ui ----
  const [fullOpen, setFullOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const audioRef = useRef<HTMLAudioElement>(null);
  const ytSlotRef = useRef<HTMLDivElement>(null);
  const ytElementRef = useRef<HTMLDivElement>(null);

  const notify = (message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };

  const player = usePlayer({ audioRef, ytElementRef, onError: notify });
  const { active } = player;

  // ---------- session ----------
  const startSession = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setAuthToken(newToken);
    setToken(newToken);
  };

  const endSession = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken("");
    setToken("");
    setUser(null);
    setFavs([]);
  };

  // ---------- load data ----------
  useEffect(() => {
    api.trending().then(setHome).catch((e: Error) => notify(e.message));
  }, []);

  useEffect(() => {
    if (!token) return;
    api.me().then(setUser).catch((e: unknown) => {
      if (e instanceof ApiError && e.status === 401) endSession(); // token expired
    });
    api.favorites().then(setFavs).catch(() => {});
  }, [token]);

  // Wait a moment after typing, then search (and skip invalid input)
  useEffect(() => {
    const timer = setTimeout(() => setQuery(validateSearch(search) ? "" : search.trim()), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!query) {
      setFound([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    api
      .search(query, controller.signal)
      .then((songs) => {
        setFound(songs);
        setSearching(false);
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        notify(e.message);
        setSearching(false);
      });
    return () => controller.abort();
  }, [query]);

  // ---------- YouTube video placement ----------
  // YouTube requires the player to stay visible, so it is shown inside the
  // full-screen player, or as a small floating video when minimized.
  const ytMode = active?.source === "youtube" ? (fullOpen ? "full" : "mini") : "off";

  useLayoutEffect(() => {
    const slot = ytSlotRef.current;
    if (!slot || ytMode !== "full") return;

    const place = () => {
      const box = document.getElementById("yt-placeholder");
      if (!box) return;
      const rect = box.getBoundingClientRect();
      Object.assign(slot.style, {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`
      });
    };
    place();

    const scroller = document.querySelector(".full-player");
    window.addEventListener("resize", place);
    scroller?.addEventListener("scroll", place);
    const observer = new ResizeObserver(place);
    const box = document.getElementById("yt-placeholder");
    if (box) observer.observe(box);

    return () => {
      window.removeEventListener("resize", place);
      scroller?.removeEventListener("scroll", place);
      observer.disconnect();
      slot.removeAttribute("style");
    };
  }, [ytMode, active?.id]);

  // ---------- favourites ----------
  const isFav = (song: Song) => favs.some((f) => f.id === song.id);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  };

  async function toggleFav(song: Song) {
    if (!token) {
      openAuth("login");
      notify("Sign in to save favourites");
      return;
    }
    const had = isFav(song);
    setFavs((list) => (had ? list.filter((f) => f.id !== song.id) : [song, ...list])); // instant feedback
    try {
      const updated = had ? await api.removeFavorite(song.id) : await api.addFavorite(song);
      setFavs(updated);
      notify(had ? "Removed from favourites" : "Added to favourites");
    } catch (e) {
      notify((e as Error).message);
      api.favorites().then(setFavs).catch(() => {});
    }
  }

  // ---------- auth ----------
  async function submitAuth(mode: AuthMode, values: AuthValues) {
    setAuthBusy(true);
    setAuthError("");
    try {
      const result =
        mode === "register"
          ? await api.register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
          : await api.login({ email: values.email.trim(), password: values.password });
      startSession(result.token);
      setUser(result.user);
      setAuthOpen(false);
      notify(mode === "register" ? `Welcome to Sonora, ${result.user.name}!` : `Welcome back, ${result.user.name}!`);
    } catch (e) {
      setAuthError((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }

  const logout = () => {
    endSession();
    notify("You have been signed out");
  };

  const playSong = (song: Song, list: Song[]) => {
    player.play(song, list);
    setFullOpen(true); // show the song full screen when it starts
  };

  // ---------- render helpers ----------
  const itemProps = (song: Song, list: Song[]) => ({
    song,
    list,
    isActive: active?.id === song.id,
    isPlaying: player.playing,
    isFav: isFav(song),
    onPlay: playSong,
    onToggleFav: toggleFav
  });

  const renderList = (songs: Song[]) => (
    <div className="track-list">
      {songs.slice(0, 40).map((song, index) => (
        <TrackRow key={song.id} index={index} {...itemProps(song, songs)} />
      ))}
    </div>
  );

  const searchError = validateSearch(search);
  const discoverList = query ? found : home;
  const trending = home.slice(0, 5);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><AudioLines size={23} /></div>
          <span>sonora<span className="brand-dot">.</span></span>
        </div>
        <div className="side-label">MENU</div>
        <nav>
          <button className={`nav-link ${page === "Home" ? "active" : ""}`} onClick={() => setPage("Home")}>
            <Home size={19} />Home
          </button>
          <button className={`nav-link ${page === "Discover" ? "active" : ""}`} onClick={() => setPage("Discover")}>
            <Compass size={19} />Discover
          </button>
        </nav>
        <div className="side-label library-label">YOUR LIBRARY</div>
        <nav>
          <button className={`nav-link ${page === "Favourites" ? "active" : ""}`} onClick={() => setPage("Favourites")}>
            <Heart size={19} />Favourites
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-mini">
            {user ? (
              <>
                <div className="avatar">{user.name[0]?.toUpperCase() || "S"}</div>
                <span><b>{user.name}</b><small>{user.email}</small></span>
                <button className="icon-btn" title="Sign out" onClick={logout}><LogOut size={17} /></button>
              </>
            ) : (
              <>
                <div className="avatar"><UserRound size={18} /></div>
                <span><b>Guest listener</b><small>Sign in to save favourites</small></span>
                <button className="text-btn" onClick={() => openAuth("login")}>Sign in</button>
              </>
            )}
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark"><AudioLines size={20} /></div>sonora.
          </div>
          <div className={`search-box ${searchError ? "invalid" : ""}`}>
            <Search size={18} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage("Discover");
              }}
              placeholder="Search songs, artists..."
              maxLength={120}
              aria-invalid={Boolean(searchError)}
            />
          </div>
          <div className="top-actions">
            {user ? (
              <button className="user-chip" onClick={() => setPage("Favourites")}>
                <div className="avatar small">{user.name[0]?.toUpperCase()}</div>
                <span>{user.name.split(" ")[0]}</span>
                <ChevronDown size={14} />
              </button>
            ) : (
              <>
                <button className="ghost-btn" onClick={() => openAuth("register")}>Sign up</button>
                <button className="sign-btn" onClick={() => openAuth("login")}>
                  Sign in <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </header>

        <div className="content">
          {page === "Home" && (
            <section className="hero">
              <div className="hero-copy">
                <span className="eyebrow"><span className="live-dot" /> YOUR DAILY SOUNDTRACK</span>
                <h1>Listen to the<br /><em>soundtrack</em> of your life.</h1>
                <p>Find the rhythm that moves you. Your next favourite song is just a beat away.</p>
                <div className="hero-actions">
                  <button className="primary-btn" onClick={() => home.length && playSong(home[0], home)}>
                    <Play size={17} fill="currentColor" /> Start listening
                  </button>
                  <button className="ghost-btn" onClick={() => setPage("Discover")}>
                    Explore music <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="hero-visual">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="hero-disc">
                  <div className="disc-image" />
                  <div className="disc-center"><AudioLines size={26} /></div>
                </div>
                <div className="floating-note note-one">♫</div>
                <div className="floating-note note-two">♪</div>
                <div className="sound-wave">
                  {Array.from({ length: 30 }, (_, i) => (
                    <i key={i} style={{ height: `${12 + Math.abs(Math.sin(i * 0.75)) * 50}px` }} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {page !== "Home" && (
            <div className="page-heading">
              <div>
                <div className="eyebrow">SONORA / {page.toUpperCase()}</div>
                <h1>{PAGE_TITLES[page][0]} <em>{PAGE_TITLES[page][1]}</em></h1>
                <p>Good music. Good energy. All yours.</p>
              </div>
            </div>
          )}

          {page === "Home" && (
            <>
              <section className="section-block">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">MADE FOR YOUR MOMENT</span>
                    <h2>Trending <em>right now</em></h2>
                  </div>
                  <button className="see-all" onClick={() => setPage("Discover")}>
                    See all <ArrowRight size={15} />
                  </button>
                </div>
                {trending.length ? (
                  <div className="song-grid">
                    {trending.map((song) => <SongCard key={song.id} {...itemProps(song, home)} />)}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Disc3 size={34} />
                    <b>No songs yet</b>
                    <p>Make sure the backend is running on port 5000.</p>
                  </div>
                )}
              </section>
              {home.length > 5 && (
                <section className="section-block track-section">
                  <div className="section-head">
                    <div><span className="eyebrow">FRESH FINDS</span><h2>Made to be replayed</h2></div>
                  </div>
                  {renderList(home.slice(5))}
                </section>
              )}
            </>
          )}

          {page === "Discover" && (
            <>
              <section className="section-block track-section">
                <div className="section-head">
                  <div>
                    <span className="eyebrow">{query ? "SEARCH RESULTS" : "FRESH FINDS"}</span>
                    <h2>{query ? `Results for “${query}”` : "Made to be replayed"}</h2>
                  </div>
                </div>
                {searchError ? (
                  <div className="empty-state"><Search size={34} /><b>{searchError}</b></div>
                ) : searching ? (
                  <div className="empty-state"><Disc3 size={34} /><b>Searching...</b></div>
                ) : discoverList.length ? (
                  renderList(discoverList)
                ) : (
                  <div className="empty-state">
                    <Disc3 size={34} />
                    <b>No songs found</b>
                    <p>Try a different song name or artist.</p>
                  </div>
                )}
              </section>
              <section className="section-block">
                <div className="section-head">
                  <div><span className="eyebrow">EXPLORE BY VIBE</span><h2>Pick your <em>frequency</em></h2></div>
                </div>
                <div className="genre-pills">
                  {GENRES.map((genre) => (
                    <button key={genre} onClick={() => setSearch(genre)}>{genre}</button>
                  ))}
                </div>
              </section>
            </>
          )}

          {page === "Favourites" && (
            <section className="section-block track-section">
              {!token ? (
                <div className="empty-state">
                  <Heart size={34} />
                  <b>Your favourites start here</b>
                  <p>Sign in to save the songs you love.</p>
                  <button className="primary-btn compact" onClick={() => openAuth("login")}>Sign in</button>
                </div>
              ) : favs.length ? (
                renderList(favs)
              ) : (
                <div className="empty-state">
                  <Heart size={34} />
                  <b>No favourites yet</b>
                  <p>Tap the heart next to a song to save it here.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Audio engine for Jamendo / iTunes songs */}
      <audio ref={audioRef} {...player.audioHandlers} />

      {/* YouTube engine. Always mounted; moved/sized with CSS (see .yt-slot in style.css) */}
      <div ref={ytSlotRef} className={`yt-slot yt-${ytMode}`}>
        <div ref={ytElementRef} />
      </div>

      <PlayerBar
        player={player}
        isFav={active ? isFav(active) : false}
        onToggleFav={() => active && toggleFav(active)}
        onOpenFull={() => setFullOpen(true)}
      />

      {active && fullOpen && (
        <FullPlayer
          song={active}
          player={player}
          isFav={isFav(active)}
          onToggleFav={() => toggleFav(active)}
          onClose={() => setFullOpen(false)}
        />
      )}

      {authOpen && (
        <AuthModal
          mode={authMode}
          busy={authBusy}
          serverError={authError}
          onModeChange={openAuth}
          onClose={() => setAuthOpen(false)}
          onSubmit={submitAuth}
        />
      )}

      {toast && <div className="toast"><Check size={17} />{toast}</div>}
    </div>
  );
}
