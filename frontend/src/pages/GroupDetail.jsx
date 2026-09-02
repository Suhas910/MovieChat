import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMG_SM = 'https://image.tmdb.org/t/p/w185';

export default function GroupDetail() {
  const { groupId } = useParams();
  const { token } = useAuth();

  // ── Group Movies ──────────────────────────────────────────────
  const [groupMovies, setGroupMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState('');

  // ── Movie Search ──────────────────────────────────────────────
  const [query, setQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [addingMovie, setAddingMovie] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // ── Popular Movies ────────────────────────────────────────────
  const [popular, setPopular] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);

  // ── Active tab ────────────────────────────────────────────────
  const [tab, setTab] = useState('movies'); // 'movies' | 'popular'

  // ── Add Member Modal ──────────────────────────────────────────
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberUsername, setMemberUsername] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [memberMsg, setMemberMsg] = useState('');
  const [memberError, setMemberError] = useState('');

  // ── Per-movie feedback (ratings + reviews) ────────────────────
  // { [movieId]: { loaded: bool, ratings: [], reviews: [] } }
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    loadGroupMovies();
    loadPopular();
  }, [groupId]);

  // ── Data Loaders ──────────────────────────────────────────────

  async function loadGroupMovies() {
    setMoviesLoading(true);
    setMoviesError('');
    try {
      const data = await api.groupMovies(groupId, token);
      setGroupMovies(Array.isArray(data) ? data : []);
    } catch (err) {
      setMoviesError(err.message);
    } finally {
      setMoviesLoading(false);
    }
  }

  async function loadPopular() {
    setPopularLoading(true);
    try {
      const data = await api.popularMovies(groupId, token);
      setPopular(data?.results?.slice(0, 20) || []);
    } catch {
      setPopular([]);
    } finally {
      setPopularLoading(false);
    }
  }

  async function loadFeedback(movieId) {
    if (feedback[movieId]?.loaded) return; // already fetched
    setFeedback(prev => ({ ...prev, [movieId]: { loaded: false, loading: true, ratings: [], reviews: [] } }));
    try {
      const data = await api.ratingsAndReviews(groupId, movieId, token);
      setFeedback(prev => ({
        ...prev,
        [movieId]: { loaded: true, loading: false, ratings: data.ratings || [], reviews: data.reviews || [] },
      }));
    } catch {
      setFeedback(prev => ({
        ...prev,
        [movieId]: { loaded: true, loading: false, ratings: [], reviews: [] },
      }));
    }
  }

  // ── Search ────────────────────────────────────────────────────

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchError('');
    setSearchResult(null);
    setAddMsg('');
    setSearching(true);
    try {
      const result = await api.searchMovie(groupId, query.trim(), token);
      setSearchResult(result);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddMovieFromSearch() {
    if (!searchResult) return;
    setAddingMovie(true);
    setSearchError('');
    try {
      const res = await api.addMovie(groupId, searchResult.title, token);
      setAddMsg(res.message || 'Added!');
      setSearchResult(null);
      setQuery('');
      await loadGroupMovies();
      setTab('movies');
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setAddingMovie(false);
    }
  }

  async function handleAddPopularMovie(movie) {
    setAddMsg('');
    try {
      const res = await api.addMovie(groupId, movie.title, token);
      setAddMsg(`"${movie.title}" ${res.message || 'added!'}`);
      await loadGroupMovies();
    } catch (err) {
      setAddMsg(`Error: ${err.message}`);
    }
  }

  // ── Rating ────────────────────────────────────────────────────

  async function handleRate(movieId, rating) {
    try {
      await api.addRating(groupId, movieId, rating, token);
      // Force reload feedback for this movie
      setFeedback(prev => ({ ...prev, [movieId]: { ...prev[movieId], loaded: false } }));
      await loadFeedback(movieId);
    } catch (err) {
      console.error('Rating failed:', err.message);
    }
  }

  // ── Review ────────────────────────────────────────────────────

  async function handleReview(movieId, content) {
    try {
      await api.addReview(groupId, movieId, content, token);
      setFeedback(prev => ({ ...prev, [movieId]: { ...prev[movieId], loaded: false } }));
      await loadFeedback(movieId);
    } catch (err) {
      console.error('Review failed:', err.message);
    }
  }

  // ── Add Member ────────────────────────────────────────────────

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberMsg('');
    setMemberError('');
    setAddingMember(true);
    try {
      await api.addMember(groupId, memberUsername.trim(), token);
      setMemberMsg(`✓ "${memberUsername}" has been added to the group!`);
      setMemberUsername('');
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setAddingMember(false);
    }
  }

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="page fade-in">

      {/* Back link */}
      <Link to="/groups" id="back-to-groups" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 14, marginBottom: 20, transition: 'color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        ← Back to groups
      </Link>

      {/* ── Group Header ── */}
      <div className="hero-gradient" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
        <div>
          <h1 style={{ marginBottom: 6 }}>🎬 Group #{groupId}</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Search movies, add them to the group, then rate and review together.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => { setMemberOpen(true); setMemberMsg(''); setMemberError(''); }} id="open-add-member-btn">
          👥 Add Member
        </button>
      </div>

      {/* ── Movie Search Section ── */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <span className="icon">🔍</span>
            <h2>Find & Add a Movie</h2>
          </div>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 16 }} id="search-form">
          <input
            id="search-input"
            type="text"
            className="form-input"
            placeholder="e.g. The Dark Knight, Inception, Interstellar..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, maxWidth: 480 }}
          />
          <button type="submit" className="btn btn-primary" disabled={searching || !query.trim()} id="search-btn">
            {searching ? <><div className="spinner spinner-sm" /> Searching...</> : '🔍 Search'}
          </button>
        </form>

        {/* Status messages */}
        {searchError && <div className="alert alert-error" style={{ marginBottom: 12 }} id="search-error">⚠ {searchError}</div>}
        {addMsg && <div className="alert alert-success" style={{ marginBottom: 12 }} id="add-msg">🎉 {addMsg}</div>}

        {/* Search result card */}
        {searchResult && (
          <SearchResultCard
            movie={searchResult}
            onAdd={handleAddMovieFromSearch}
            onDismiss={() => setSearchResult(null)}
            adding={addingMovie}
          />
        )}
      </div>

      {/* ── Tabs: Group Movies / Popular ── */}
      <div className="section">
        <div className="tabs">
          <button className={`tab ${tab === 'movies' ? 'active' : ''}`} onClick={() => setTab('movies')} id="tab-movies">
            🎬 Group Movies {!moviesLoading && `(${groupMovies.length})`}
          </button>
          <button className={`tab ${tab === 'popular' ? 'active' : ''}`} onClick={() => setTab('popular')} id="tab-popular">
            🔥 Popular Now
          </button>
        </div>

        {/* ── GROUP MOVIES ── */}
        {tab === 'movies' && (
          <>
            {moviesError && <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {moviesError}</div>}

            {moviesLoading ? (
              <div className="grid-cards">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="skeleton" style={{ aspectRatio: '2/3.5', borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : groupMovies.length === 0 ? (
              <div className="card" style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
                <span style={{ fontSize: 48 }}>🍿</span>
                <h3 style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>No movies yet</h3>
                <p>Search for a movie above or browse popular movies to add one to the group.</p>
              </div>
            ) : (
              <div className="grid-cards">
                {groupMovies.map(movie => (
                  <GroupMovieCard
                    key={movie.movie_id}
                    movie={movie}
                    feedback={feedback[movie.movie_id]}
                    onExpand={() => loadFeedback(movie.movie_id)}
                    onRate={(rating) => handleRate(movie.movie_id, rating)}
                    onReview={(text) => handleReview(movie.movie_id, text)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── POPULAR MOVIES ── */}
        {tab === 'popular' && (
          <>
            {addMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>🎉 {addMsg}</div>}
            {popularLoading ? (
              <div className="grid-cards">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <div key={i} className="skeleton" style={{ aspectRatio: '2/3.5', borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <div className="empty-state">
                <span style={{ fontSize: 40 }}>📡</span>
                <p>Couldn't load popular movies.</p>
              </div>
            ) : (
              <div className="grid-cards">
                {popular.map(movie => (
                  <PopularMovieCard key={movie.id} movie={movie} onAdd={() => handleAddPopularMovie(movie)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Member Modal ── */}
      <Modal isOpen={memberOpen} onClose={() => setMemberOpen(false)} title="👥 Add Member" id="add-member-modal">
        <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="member-input">Username to add</label>
            <input
              id="member-input"
              type="text"
              className="form-input"
              placeholder="Enter their exact username"
              value={memberUsername}
              onChange={e => setMemberUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: -8 }}>
            ⚠ Only the group creator (admin) can add members.
          </p>
          {memberError && <div className="alert alert-error" id="member-error">⚠ {memberError}</div>}
          {memberMsg && <div className="alert alert-success" id="member-success">{memberMsg}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setMemberOpen(false)} id="member-cancel">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={addingMember || !memberUsername.trim()} id="member-submit">
              {addingMember ? <><div className="spinner spinner-sm" /> Adding...</> : 'Add Member'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── Search Result Card ─────────────────────────────────────────────────────────
function SearchResultCard({ movie, onAdd, onDismiss, adding }) {
  const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
  const year = (movie.release_date || '').slice(0, 4);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 0, background: 'var(--bg-card)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxWidth: 580 }} className="fade-in" id="search-result-card">
      <div style={{ background: 'var(--bg-raised)', minHeight: 200 }}>
        {poster
          ? <img src={poster} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>🎬</div>
        }
      </div>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h3 style={{ marginBottom: 4, fontSize: 16 }}>{movie.title}</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            {year && <span className="badge badge-accent">{year}</span>}
            {movie.vote_average > 0 && <span className="badge badge-success">⭐ {movie.vote_average.toFixed(1)}</span>}
          </div>
          {movie.overview && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {movie.overview}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={onAdd} disabled={adding} id="confirm-add-btn">
            {adding ? <><div className="spinner spinner-sm" /> Adding...</> : '+ Add to Group'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDismiss} id="dismiss-result-btn">Dismiss</button>
        </div>
      </div>
    </div>
  );
}

// ── Group Movie Card (with expand, rate, review) ───────────────────────────────
function GroupMovieCard({ movie, feedback, onExpand, onRate, onReview }) {
  const [expanded, setExpanded] = useState(false);

  const poster = movie.poster_url ? `${TMDB_IMG}${movie.poster_url}` : null;
  const year = (movie.release_year || '').slice(0, 4);

  const avgRating = feedback?.ratings?.length
    ? (feedback.ratings.reduce((s, r) => s + r.rating, 0) / feedback.ratings.length).toFixed(1)
    : null;

  function handleToggle() {
    if (!expanded) onExpand();
    setExpanded(v => !v);
  }

  return (
    <div className="movie-card fade-in" id={`movie-${movie.movie_id}`}>
      {/* Poster */}
      <div className="movie-poster">
        {poster
          ? <img src={poster} alt={movie.title} loading="lazy" />
          : <div className="movie-poster-placeholder">🎬</div>
        }
      </div>

      {/* Info */}
      <div className="movie-info">
        <div className="movie-title" title={movie.title}>{movie.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <span className="movie-year">{year || '—'}</span>
          {avgRating && <span className="movie-rating-badge">⭐ {avgRating}</span>}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', fontSize: 12, marginTop: 10 }}
          onClick={handleToggle}
          id={`toggle-${movie.movie_id}`}
        >
          {expanded ? '▲ Collapse' : '▼ Rate & Review'}
        </button>
      </div>

      {/* Expand Panel */}
      {expanded && (
        <div className="expand-panel">
          {/* Rate */}
          <RateSection movieId={movie.movie_id} onRate={onRate} />

          <div className="divider" style={{ margin: '14px 0' }} />

          {/* Review */}
          <ReviewSection movieId={movie.movie_id} onReview={onReview} />

          {/* Existing feedback */}
          {feedback?.loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
              <div className="spinner spinner-sm" />
            </div>
          )}

          {feedback?.loaded && (
            <>
              {/* Ratings summary */}
              {feedback.ratings.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Group Ratings ({feedback.ratings.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {feedback.ratings.map((r, i) => (
                      <span key={i} className="badge badge-accent">⭐ {r.rating}/10</span>
                    ))}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    Average: <strong style={{ color: 'var(--accent)' }}>{(feedback.ratings.reduce((s, r) => s + r.rating, 0) / feedback.ratings.length).toFixed(1)}</strong>/10
                  </div>
                </div>
              )}

              {/* Reviews */}
              {feedback.reviews.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Reviews ({feedback.reviews.length})
                  </div>
                  {feedback.reviews.map((rev, i) => (
                    <div key={rev.review_id || i} className="review-item">
                      <div className="review-header">
                        <span className="review-author">User #{rev.user_id}</span>
                        {rev.created_at && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="review-content">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {feedback.ratings.length === 0 && feedback.reviews.length === 0 && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 12 }}>
                  Be the first to rate or review this movie!
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Rate Section ──────────────────────────────────────────────────────────────
function RateSection({ movieId, onRate }) {
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    await onRate(selected);
    setSubmitted(true);
    // Allow re-rating after 3s
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Rate this movie (1–10)
      </div>
      {submitted ? (
        <div className="alert alert-success" style={{ fontSize: 13 }}>✓ Rating saved!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button
                key={n}
                onClick={() => setSelected(n)}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: '2px solid',
                  borderColor: selected >= n ? 'var(--accent)' : 'var(--border)',
                  background: selected >= n ? 'var(--accent)' : 'var(--bg-raised)',
                  color: selected >= n ? '#0a0a0a' : 'var(--text-muted)',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                title={`${n}/10`}
                id={`rate-${movieId}-${n}`}
              >
                {n}
              </button>
            ))}
            {selected > 0 && (
              <span style={{ marginLeft: 6, fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>
                {selected}/10
              </span>
            )}
          </div>
          {selected > 0 && (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: 'fit-content', fontSize: 12, padding: '5px 14px' }}
              onClick={submit}
              id={`submit-rate-${movieId}`}
            >
              Submit Rating
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Review Section ────────────────────────────────────────────────────────────
function ReviewSection({ movieId, onReview }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await onReview(text.trim());
    setText('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        Write a review
      </div>
      {submitted ? (
        <div className="alert alert-success" style={{ fontSize: 13 }}>✓ Review posted!</div>
      ) : (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea
            className="form-input"
            placeholder="Share your thoughts on this movie..."
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ minHeight: 68, fontSize: 13 }}
            id={`review-input-${movieId}`}
          />
          {text.trim() && (
            <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content', fontSize: 12, padding: '5px 14px' }} id={`submit-review-${movieId}`}>
              Post Review
            </button>
          )}
        </form>
      )}
    </div>
  );
}

// ── Popular Movie Card ────────────────────────────────────────────────────────
function PopularMovieCard({ movie, onAdd }) {
  const [adding, setAdding] = useState(false);
  const [done, setDone] = useState(false);
  const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
  const year = (movie.release_date || '').slice(0, 4);

  async function handleAdd() {
    setAdding(true);
    await onAdd(movie);
    setAdding(false);
    setDone(true);
  }

  return (
    <div className="movie-card fade-in" id={`popular-${movie.id}`}>
      <div className="movie-poster">
        {poster
          ? <img src={poster} alt={movie.title} loading="lazy" />
          : <div className="movie-poster-placeholder">🎬</div>
        }
        <div className="movie-poster-overlay">
          {done ? (
            <span className="badge badge-success" style={{ width: '100%', justifyContent: 'center' }}>✓ Added</span>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: '100%' }}
              onClick={handleAdd}
              disabled={adding}
              id={`add-popular-${movie.id}`}
            >
              {adding ? <div className="spinner spinner-sm" /> : '+ Add to Group'}
            </button>
          )}
        </div>
      </div>
      <div className="movie-info">
        <div className="movie-title" title={movie.title}>{movie.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
          <span className="movie-year">{year}</span>
          {movie.vote_average > 0 && <span className="movie-rating-badge">⭐ {movie.vote_average.toFixed(1)}</span>}
        </div>
      </div>
    </div>
  );
}