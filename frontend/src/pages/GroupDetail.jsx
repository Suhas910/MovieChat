import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

export default function GroupDetail() {
  const { groupId } = useParams();
  const { token } = useAuth();

  // ── Group Movies ──────────────────────────────────────────────
  const [groupMovies, setGroupMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState("");

  // ── Movie Search ──────────────────────────────────────────────
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addingMovie, setAddingMovie] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  // ── Popular Movies ────────────────────────────────────────────
  const [popular, setPopular] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);

  // ── Active tab ────────────────────────────────────────────────
  const [tab, setTab] = useState("movies"); // 'movies' | 'popular'

  // ── Add Member Modal ──────────────────────────────────────────
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberUsername, setMemberUsername] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [memberMsg, setMemberMsg] = useState("");
  const [memberError, setMemberError] = useState("");
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");

  // ── Per-movie feedback (ratings + reviews) ────────────────────
  // { [movieId]: { loaded: bool, ratings: [], reviews: [] } }
  const [feedback, setFeedback] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    async function loadPage() {
      const movies = await loadGroupMovies(controller.signal);
      await Promise.all(
        movies.map((movie) => loadFeedback(movie.movie_id, controller.signal)),
      );
      await loadPopular(controller.signal);
    }

    loadPage().catch((err) => {
      if (!controller.signal.aborted) {
        console.error("Group page failed to load:", err);
      }
    });
    return () => controller.abort();
    // The loaders are scoped to this page instance; feedback updates must not restart the page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, token]);

  // ── Data Loaders ──────────────────────────────────────────────

  async function loadGroupMovies(signal) {
    setMoviesLoading(true);
    setMoviesError("");
    try {
      const data = await api.groupMovies(groupId, token, { signal });
      const movies = Array.isArray(data) ? data : [];
      setGroupMovies(movies);
      return movies;
    } catch (err) {
      if (!signal?.aborted) setMoviesError(err.message);
      return [];
    } finally {
      setMoviesLoading(false);
    }
  }

  async function loadPopular(signal) {
    setPopularLoading(true);
    try {
      const data = await api.popularMovies(groupId, token, { signal });
      setPopular(data?.results?.slice(0, 20) || []);
    } catch {
      setPopular([]);
    } finally {
      setPopularLoading(false);
    }
  }

  async function loadFeedback(movieId, signal, force = false) {
    if (!force && (feedback[movieId]?.loaded || feedback[movieId]?.loading))
      return;
    setFeedback((prev) => ({
      ...prev,
      [movieId]: { loaded: false, loading: true, ratings: [], reviews: [] },
    }));
    try {
      const data = await api.ratingsAndReviews(groupId, movieId, token, {
        signal,
      });
      setFeedback((prev) => ({
        ...prev,
        [movieId]: {
          loaded: true,
          loading: false,
          ratings: data.ratings || [],
          reviews: data.reviews || [],
        },
      }));
    } catch {
      if (!signal?.aborted) {
        setFeedback((prev) => ({
          ...prev,
          [movieId]: { loaded: true, loading: false, ratings: [], reviews: [] },
        }));
      }
    }
  }

  // ── Search ────────────────────────────────────────────────────

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchError("");
    setSearchResult(null);
    setAddMsg("");
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
    setSearchError("");
    try {
      const res = await api.addMovie(groupId, searchResult.title, token);
      setAddMsg(res.message || "Added!");
      setSearchResult(null);
      setQuery("");
      await loadGroupMovies();
      setTab("movies");
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setAddingMovie(false);
    }
  }

  async function handleAddPopularMovie(movie) {
    setAddMsg("");
    try {
      const res = await api.addMovie(groupId, movie.title, token);
      setAddMsg(`"${movie.title}" ${res.message || "added!"}`);
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
      setFeedback((prev) => ({
        ...prev,
        [movieId]: { ...prev[movieId], loaded: false, loading: false },
      }));
      await loadFeedback(movieId, undefined, true);
    } catch (err) {
      console.error("Rating failed:", err.message);
      throw err;
    }
  }

  // ── Review ────────────────────────────────────────────────────

  async function handleReview(movieId, content) {
    try {
      await api.addReview(groupId, movieId, content, token);
      setFeedback((prev) => ({
        ...prev,
        [movieId]: { ...prev[movieId], loaded: false, loading: false },
      }));
      await loadFeedback(movieId, undefined, true);
    } catch (err) {
      console.error("Review failed:", err.message);
      throw err;
    }
  }

  // ── Add Member ────────────────────────────────────────────────

  async function handleAddMember(e) {
    e.preventDefault();
    setMemberMsg("");
    setMemberError("");
    setAddingMember(true);
    try {
      await api.addMember(groupId, memberUsername.trim(), token);
      setMemberMsg(`"${memberUsername}" has been added to the group!`);
      setMemberUsername("");
    } catch (err) {
      setMemberError(err.message);
    } finally {
      setAddingMember(false);
    }
  }

  async function handleViewMembers() {
    setMembersOpen(true);
    setMembersLoading(true);
    setMembersError("");
    try {
      const data = await api.groupMembers(groupId, token);
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      setMembersError(err.message);
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────

  return (
    <div className="page fade-in">
      {/* Back link */}
      <Link to="/groups" id="back-to-groups" className="back-link">
        ← All groups
      </Link>

      {/* ── Group Header ── */}
      <div className="group-header">
        <div>
          <div className="group-header-title-row">
            <h1>Film Club</h1>
            <span className="group-header-num">#{groupId}</span>
          </div>
          <p>
            Search movies, add them to the group, then rate and review together.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleViewMembers}
            id="open-members-btn"
          >
            View Members
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setMemberOpen(true);
              setMemberMsg("");
              setMemberError("");
            }}
            id="open-add-member-btn"
          >
            Add Member
          </button>
        </div>
      </div>

      {/* ── Movie Search Section ── */}
      <div className="section">
        <div className="section-header">
          <div className="section-title">
            <h2>Find a Movie</h2>
          </div>
        </div>

        <form
          onSubmit={handleSearch}
          className="search-row"
          style={{ marginBottom: 16 }}
          id="search-form"
        >
          <input
            id="search-input"
            type="text"
            className="form-input"
            placeholder="The Dark Knight, Inception, Interstellar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={searching || !query.trim()}
            id="search-btn"
          >
            {searching ? (
              <>
                <div className="spinner spinner-sm" /> Searching...
              </>
            ) : (
              "Search"
            )}
          </button>
        </form>

        {/* Status messages */}
        {searchError && (
          <div
            className="alert alert-error"
            style={{ marginBottom: 12 }}
            id="search-error"
          >
            {searchError}
          </div>
        )}
        {addMsg && (
          <div
            className="alert alert-success"
            style={{ marginBottom: 12 }}
            id="add-msg"
          >
            {addMsg}
          </div>
        )}

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
          <button
            className={`tab ${tab === "movies" ? "active" : ""}`}
            onClick={() => setTab("movies")}
            id="tab-movies"
          >
            Group Movies {!moviesLoading && `(${groupMovies.length})`}
          </button>
          <button
            className={`tab ${tab === "popular" ? "active" : ""}`}
            onClick={() => setTab("popular")}
            id="tab-popular"
          >
            Popular Now
          </button>
        </div>

        {/* ── GROUP MOVIES ── */}
        {tab === "movies" && (
          <>
            {moviesError && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                {moviesError}
              </div>
            )}

            {moviesLoading ? (
              <div className="grid-cards">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{
                      aspectRatio: "2/3.2",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                ))}
              </div>
            ) : groupMovies.length === 0 ? (
              <div className="empty-groups-card">
                <span className="empty-icon">🎬</span>
                <h3>Nothing queued up yet</h3>
                <p>
                  Search for a title above, or pick one from Popular Now — the
                  first add is the hardest.
                </p>
              </div>
            ) : (
              <div className="grid-cards">
                {groupMovies.map((movie) => (
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
        {tab === "popular" && (
          <>
            {addMsg && (
              <div className="alert alert-success" style={{ marginBottom: 16 }}>
                {addMsg}
              </div>
            )}
            {popularLoading ? (
              <div className="grid-cards">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="skeleton"
                    style={{
                      aspectRatio: "2/3.2",
                      borderRadius: "var(--radius-sm)",
                    }}
                  />
                ))}
              </div>
            ) : popular.length === 0 ? (
              <div className="empty-state">
                <span className="icon">📡</span>
                <p>Couldn't load popular movies.</p>
              </div>
            ) : (
              <div className="grid-cards">
                {popular.map((movie) => (
                  <PopularMovieCard
                    key={movie.id}
                    movie={movie}
                    onAdd={() => handleAddPopularMovie(movie)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Member Modal ── */}
      <Modal
        isOpen={memberOpen}
        onClose={() => setMemberOpen(false)}
        title="Add Member"
        id="add-member-modal"
      >
        <form
          onSubmit={handleAddMember}
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          <div className="form-group">
            <label className="form-label" htmlFor="member-input">
              Username
            </label>
            <input
              id="member-input"
              type="text"
              className="form-input"
              placeholder="Enter their exact username"
              value={memberUsername}
              onChange={(e) => setMemberUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <p style={{ fontSize: 13, color: "var(--fog)", marginTop: -8 }}>
            Only the group creator can add members. They must already have an
            account.
          </p>
          {memberError && (
            <div className="alert alert-error" id="member-error">
              {memberError}
            </div>
          )}
          {memberMsg && (
            <div className="alert alert-success" id="member-success">
              {memberMsg}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setMemberOpen(false)}
              id="member-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={addingMember || !memberUsername.trim()}
              id="member-submit"
            >
              {addingMember ? (
                <>
                  <div className="spinner spinner-sm" /> Adding...
                </>
              ) : (
                "Add Member"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={membersOpen}
        onClose={() => setMembersOpen(false)}
        title="Group Members"
        id="members-modal"
      >
        {membersLoading ? (
          <div className="empty-state">
            <p>Loading members...</p>
          </div>
        ) : membersError ? (
          <div className="alert alert-error" id="members-error">
            {membersError}
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state">
            <p>This group has no members yet.</p>
          </div>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gap: 10,
            }}
          >
            {members.map((username) => (
              <li
                key={username}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                {username}
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}

// ── Search Result Card ─────────────────────────────────────────────────────────
function SearchResultCard({ movie, onAdd, onDismiss, adding }) {
  const poster = movie.poster_path ? `${TMDB_IMG}${movie.poster_path}` : null;
  const year = (movie.release_date || "").slice(0, 4);

  return (
    <div className="search-result-card fade-in" id="search-result-card">
      <div className="search-result-poster">
        {poster ? (
          <img src={poster} alt={movie.title} />
        ) : (
          <div className="search-result-poster-fallback">🎬</div>
        )}
      </div>
      <div className="search-result-body">
        <div>
          <h3 className="search-result-title">{movie.title}</h3>
          <div className="search-result-meta">
            {year && <span className="badge badge-accent">{year}</span>}
            {movie.vote_average > 0 && (
              <span className="badge badge-success">
                {movie.vote_average.toFixed(1)} TMDB
              </span>
            )}
          </div>
          {movie.overview && (
            <p className="search-result-overview">{movie.overview}</p>
          )}
        </div>
        <div className="search-result-actions">
          <button
            className="btn btn-primary btn-sm"
            onClick={onAdd}
            disabled={adding}
            id="confirm-add-btn"
          >
            {adding ? (
              <>
                <div className="spinner spinner-sm" /> Adding...
              </>
            ) : (
              "Add to Group"
            )}
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onDismiss}
            id="dismiss-result-btn"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Group Movie Card (with expand, rate, review) ───────────────────────────────
function GroupMovieCard({ movie, feedback, onExpand, onRate, onReview }) {
  const [expanded, setExpanded] = useState(false);

  const poster = movie.poster_url ? `${TMDB_IMG}${movie.poster_url}` : null;
  const year = (movie.release_year || "").slice(0, 4);

  const validRatings = (feedback?.ratings || [])
    .map((rating) => Number(rating.rating))
    .filter(
      (rating) => Number.isFinite(rating) && rating >= 0.5 && rating <= 5,
    );
  const avgRating = validRatings.length
    ? (
        validRatings.reduce((sum, rating) => sum + rating, 0) /
        validRatings.length
      ).toFixed(1)
    : null;

  // avg is already a float for star display
  const avg = avgRating ? parseFloat(avgRating) : 0;

  function handleToggle() {
    if (!expanded) onExpand();
    setExpanded((v) => !v);
  }

  return (
    <div className="movie-card fade-in" id={`movie-${movie.movie_id}`}>
      {/* Poster */}
      <div className="movie-poster">
        {poster ? (
          <img src={poster} alt={movie.title} loading="lazy" />
        ) : (
          <div className="movie-poster-placeholder">🎬</div>
        )}
      </div>

      {/* Info */}
      <div className="movie-info">
        <div className="movie-title" title={movie.title}>
          {movie.title}
        </div>
        <div className="movie-info-row">
          <span className="movie-year">{year || "—"}</span>
          {avgRating && (
            <span className="movie-rating-badge">
              <span className="star-badge-strip" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((star) => {
                  const cls =
                    avg >= star ? "full" : avg >= star - 0.5 ? "half" : "empty";
                  return (
                    <span key={star} className={`star-badge-icon ${cls}`}>★</span>
                  );
                })}
              </span>
              {avgRating}
            </span>
          )}
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: "100%", fontSize: 12, marginTop: 8 }}
          onClick={handleToggle}
          id={`toggle-${movie.movie_id}`}
        >
          {expanded ? "Collapse" : "Rate & Review"}
        </button>
      </div>

      {/* Expand Panel */}
      {expanded && (
        <div className="expand-panel">
          {/* Rate */}
          <RateSection movieId={movie.movie_id} onRate={onRate} />

          <div className="divider" style={{ margin: "14px 0" }} />

          {/* Review */}
          <ReviewSection movieId={movie.movie_id} onReview={onReview} />

          {/* Existing feedback */}
          {feedback?.loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "16px 0",
              }}
            >
              <div className="spinner spinner-sm" />
            </div>
          )}

          {feedback?.loaded && (
            <>
              {/* Ratings summary */}
              {validRatings.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="panel-section-label">
                    Group Ratings ({validRatings.length})
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {feedback.ratings.map((r, i) => (
                      <span key={i} className="badge badge-accent">
                        {r.username}: {r.rating}/5
                      </span>
                    ))}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 13,
                      color: "var(--silver)",
                    }}
                  >
                    Average:{" "}
                    <span
                      style={{
                        color: "var(--amber)",
                        fontFamily: "var(--font-display)",
                        fontStyle: "italic",
                      }}
                    >
                      {(
                        feedback.ratings.reduce((s, r) => s + r.rating, 0) /
                        feedback.ratings.length
                      ).toFixed(1)}
                    </span>{" "}
                    / 5
                  </div>
                </div>
              )}

              {/* Reviews */}
              {feedback.reviews.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="panel-section-label">
                    Reviews ({feedback.reviews.length})
                  </div>
                  {feedback.reviews.map((rev, i) => (
                    <div key={rev.review_id || i} className="review-item">
                      <div className="review-header">
                        <span className="review-author">{rev.username}</span>
                        {rev.created_at && (
                          <span className="review-date">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="review-content">{rev.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {feedback.ratings.length === 0 &&
                feedback.reviews.length === 0 && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--fog)",
                      textAlign: "center",
                      paddingTop: 12,
                    }}
                  >
                    No ratings or reviews yet — be the first.
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
  const [hovered, setHovered] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!selected || submitting) return;
    setSubmitting(true);
    setError("");
    setSubmitted(true);
    try {
      await onRate(selected);
    } catch (err) {
      setSubmitted(false);
      setError(err.message || "Could not save your rating.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="panel-section-label">Rate this movie (0.5–5)</div>
      {submitted ? (
        <div className="rating-success" role="status">
          <span className="rating-success-mark" aria-hidden="true">
            ★
          </span>
          <span>{submitting ? "Saving your rating..." : "Rating saved!"}</span>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            className="rating-input-row rating-stars"
            role="radiogroup"
            aria-label="Rate this movie from 0.5 to 5 stars"
            onMouseLeave={() => setHovered(null)}
          >
            {[1, 2, 3, 4, 5].map((star) => {
              const displayValue = hovered !== null ? hovered : selected;
              const starValue =
                displayValue >= star
                  ? "full"
                  : displayValue >= star - 0.5
                    ? "half"
                    : "empty";
              return (
                <span key={star} className="rating-star-cell">
                  <span
                    className={`rating-star-icon ${starValue}`}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                  <button
                    type="button"
                    className="rating-star-btn rating-star-half"
                    onClick={() => setSelected(star - 0.5)}
                    onMouseEnter={() => setHovered(star - 0.5)}
                    title={`${star - 0.5}/5`}
                    aria-label={`Rate ${star - 0.5} out of 5`}
                    aria-checked={selected === star - 0.5}
                    role="radio"
                    id={`rate-${movieId}-${star - 0.5}`}
                  />
                  <button
                    type="button"
                    className="rating-star-btn rating-star-full"
                    onClick={() => setSelected(star)}
                    onMouseEnter={() => setHovered(star)}
                    title={`${star}/5`}
                    aria-label={`Rate ${star} out of 5`}
                    aria-checked={selected === star}
                    role="radio"
                    id={`rate-${movieId}-${star}`}
                  />
                </span>
              );
            })}
            {(hovered !== null ? hovered : selected) > 0 && (
              <span className="rating-value-label">
                {hovered !== null ? hovered : selected}
                <small>/5</small>
              </span>
            )}
          </div>
          {error && (
            <div className="alert alert-error" style={{ fontSize: 13 }}>
              {error}
            </div>
          )}
          {selected > 0 && (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: "fit-content" }}
              onClick={submit}
              disabled={submitting}
              id={`submit-rate-${movieId}`}
            >
              {submitting ? "Saving..." : "Submit Rating"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Review Section ────────────────────────────────────────────────────────────
function ReviewSection({ movieId, onReview }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await onReview(text.trim());
    setText("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  }

  return (
    <div>
      <div className="panel-section-label">Write a review</div>
      {submitted ? (
        <div className="alert alert-success" style={{ fontSize: 13 }}>
          Review posted!
        </div>
      ) : (
        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <textarea
            className="form-input"
            placeholder="Share your thoughts on this movie…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ minHeight: 68, fontSize: 13 }}
            id={`review-input-${movieId}`}
          />
          {text.trim() && (
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{ width: "fit-content" }}
              id={`submit-review-${movieId}`}
            >
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
  const year = (movie.release_date || "").slice(0, 4);

  async function handleAdd() {
    setAdding(true);
    await onAdd(movie);
    setAdding(false);
    setDone(true);
  }

  return (
    <div className="movie-card fade-in" id={`popular-${movie.id}`}>
      <div className="movie-poster">
        {poster ? (
          <img src={poster} alt={movie.title} loading="lazy" />
        ) : (
          <div className="movie-poster-placeholder">🎬</div>
        )}
        <div className="movie-poster-overlay">
          {done ? (
            <span
              className="badge badge-success"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Added
            </span>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              style={{ width: "100%" }}
              onClick={handleAdd}
              disabled={adding}
              id={`add-popular-${movie.id}`}
            >
              {adding ? <div className="spinner spinner-sm" /> : "Add to Group"}
            </button>
          )}
        </div>
      </div>
      <div className="movie-info">
        <div className="movie-title" title={movie.title}>
          {movie.title}
        </div>
        <div className="movie-info-row">
          <span className="movie-year">{year}</span>
          {movie.vote_average > 0 && (
            <span style={{ fontSize: 12, color: "var(--fog)" }}>
              {movie.vote_average.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
