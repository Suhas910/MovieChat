import { useState } from "react";

const TMDB_IMG = "https://image.tmdb.org/t/p/w500";

/** Compact 5-star read-only badge derived from a 0.5–5 average */
function StarBadge({ avg, label }) {
  return (
    <span className="movie-rating-badge">
      <span className="star-badge-strip" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const cls =
            avg >= star ? "full" : avg >= star - 0.5 ? "half" : "empty";
          return <span key={star} className={`star-badge-icon ${cls}`}>★</span>;
        })}
      </span>
      {label}
    </span>
  );
}

/** Inline read-only star display for a given value */
function StarDisplay({ value, size = 14 }) {
  return (
    <span className="star-badge-strip" aria-hidden="true" style={{ gap: 1 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const cls =
          value >= star ? "full" : value >= star - 0.5 ? "half" : "empty";
        return (
          <span
            key={star}
            className={`star-badge-icon ${cls}`}
            style={{ fontSize: size }}
          >
            ★
          </span>
        );
      })}
    </span>
  );
}

// ── Main MovieCard ─────────────────────────────────────────────────────────────
export default function MovieCard({
  movie,
  onAdd,
  onRate,
  onReview,
  showActions = false, // shows add-to-group button (search results)
  showFeedback = false, // shows rate/review controls (group movies)
  ratingsData = null, // { ratings: [], reviews: [] }
  id,
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("rate");

  const posterSrc =
    movie.poster_url || movie.poster_path
      ? `${TMDB_IMG}${movie.poster_url || movie.poster_path}`
      : null;

  const year = (movie.release_year || movie.release_date || "").slice(0, 4);

  const avgRating = ratingsData?.ratings?.length
    ? (
        ratingsData.ratings.reduce((sum, r) => sum + r.rating, 0) /
        ratingsData.ratings.length
      ).toFixed(1)
    : null;

  const buzzCount =
    (ratingsData?.ratings?.length || 0) + (ratingsData?.reviews?.length || 0);

  return (
    <div
      className="movie-card fade-in"
      id={id || `movie-card-${movie.movie_id || movie.id}`}
    >
      <div className="movie-poster">
        {posterSrc ? (
          <img src={posterSrc} alt={movie.title} loading="lazy" />
        ) : (
          <div className="movie-poster-placeholder">🎬</div>
        )}
        {showActions && (
          <div className="movie-poster-overlay">
            <button
              className="btn btn-primary btn-sm"
              style={{ width: "100%" }}
              onClick={() => onAdd && onAdd(movie)}
              id={`add-movie-btn-${movie.id}`}
            >
              Add to Group
            </button>
          </div>
        )}
      </div>

      <div className="movie-info">
        <div className="movie-title" title={movie.title}>
          {movie.title}
        </div>
        <div className="movie-info-row">
          <span className="movie-year">{year || "—"}</span>
          {avgRating && (
            <StarBadge avg={parseFloat(avgRating)} label={avgRating} />
          )}
        </div>

        {showFeedback && (
          <div style={{ marginTop: 8 }}>
            <button
              className={`ep-toggle-btn ${expanded ? "open" : ""}`}
              onClick={() => setExpanded(!expanded)}
              id={`expand-movie-btn-${movie.movie_id}`}
            >
              <span className="ep-toggle-label">
                {expanded ? "Close" : "Rate & Review"}
              </span>
              <span className="ep-toggle-chevron">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          </div>
        )}
      </div>

      {expanded && showFeedback && (
        <div className="expand-panel">
          {/* Tab bar */}
          <div className="ep-tabs">
            <button
              className={`ep-tab ${activeTab === "rate" ? "active" : ""}`}
              onClick={() => setActiveTab("rate")}
            >
              <span className="ep-tab-icon">✦</span>
              Rate &amp; Review
            </button>
            <button
              className={`ep-tab ${activeTab === "buzz" ? "active" : ""}`}
              onClick={() => setActiveTab("buzz")}
            >
              <span className="ep-tab-icon">👥</span>
              Group Buzz
              {buzzCount > 0 && (
                <span className="ep-tab-pill">{buzzCount}</span>
              )}
            </button>
          </div>

          {/* Tab: Rate & Review */}
          {activeTab === "rate" && (
            <div className="ep-pane">
              <div className="ep-section">
                <div className="ep-section-label">Your Rating</div>
                <RatingInput
                  onSubmit={(val) => onRate && onRate(movie.movie_id, val)}
                />
              </div>
              <div className="ep-divider" />
              <div className="ep-section">
                <div className="ep-section-label">Your Review</div>
                <ReviewInput
                  onSubmit={(val) => onReview && onReview(movie.movie_id, val)}
                />
              </div>
            </div>
          )}

          {/* Tab: Group Buzz */}
          {activeTab === "buzz" && (
            <div className="ep-pane">
              {(!ratingsData?.ratings?.length && !ratingsData?.reviews?.length) ? (
                <div className="ep-empty">
                  <span className="ep-empty-icon">🍿</span>
                  <p>No ratings or reviews yet</p>
                  <span className="ep-empty-sub">Be the first to share your take</span>
                </div>
              ) : (
                <>
                  {ratingsData?.ratings?.length > 0 && (
                    <div className="ep-section">
                      <div className="ep-section-label">
                        Ratings · {ratingsData.ratings.length}
                        {avgRating && (
                          <span className="ep-avg-chip">avg {avgRating}</span>
                        )}
                      </div>
                      <div className="ep-ratings-list">
                        {ratingsData.ratings.map((r, i) => (
                          <div key={i} className="ep-rating-row">
                            <span className="ep-user-avatar">
                              {(r.username || `U${r.user_id}`)[0].toUpperCase()}
                            </span>
                            <span className="ep-rating-user">
                              {r.username || `User #${r.user_id}`}
                            </span>
                            <StarDisplay value={r.rating} size={12} />
                            <span className="ep-rating-num">{r.rating}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ratingsData?.reviews?.length > 0 && (
                    <div className="ep-section">
                      <div className="ep-section-label">
                        Reviews · {ratingsData.reviews.length}
                      </div>
                      {ratingsData.reviews.map((r, i) => (
                        <div key={r.review_id || i} className="ep-review-card">
                          <div className="ep-review-header">
                            <span className="ep-user-avatar">
                              {(r.username || `U${r.user_id}`)[0].toUpperCase()}
                            </span>
                            <span className="ep-review-author">
                              {r.username || `User #${r.user_id}`}
                            </span>
                            {r.created_at && (
                              <span className="ep-review-date">
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="ep-review-body">{r.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── RatingInput ───────────────────────────────────────────────────────────────
function RatingInput({ onSubmit }) {
  const [selected, setSelected] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [hovered, setHovered] = useState(null);

  function handleSubmit() {
    if (selected > 0) {
      onSubmit(selected);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="ep-success">
        <span className="ep-success-icon">★</span>
        Rating saved!
      </div>
    );
  }

  const displayValue = hovered !== null ? hovered : selected;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        className="rating-input-row rating-stars"
        role="radiogroup"
        aria-label="Rate this movie from 0.5 to 5 stars"
        onMouseLeave={() => setHovered(null)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
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
      {selected > 0 && (
        <button
          className="ep-submit-btn"
          onClick={handleSubmit}
        >
          Submit Rating
        </button>
      )}
    </div>
  );
}

// ── ReviewInput ───────────────────────────────────────────────────────────────
function ReviewInput({ onSubmit }) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="ep-success">
        <span className="ep-success-icon">💬</span>
        Review posted!
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <textarea
        className="form-input ep-textarea"
        placeholder="What did you think of this film?"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {text.trim() && (
        <button type="submit" className="ep-submit-btn">
          Post Review
        </button>
      )}
    </form>
  );
}
