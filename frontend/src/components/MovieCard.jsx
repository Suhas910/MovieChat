import { useState } from 'react';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

// ── Ticket Strip helpers ──────────────────────────────────────────────────────
// The signature visual device: a horizontal strip of rectangular segments
// that fill with amber to represent a rating out of 10.

/** Full 10-segment strip used in the expand panel for rating input */
function TicketStripInput({ value, onChange }) {
  return (
    <div className="rating-input-row">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          className={`rating-seg-btn ${value >= n ? 'active' : ''}`}
          onClick={() => onChange(n)}
          title={`${n}/10`}
          aria-label={`Rate ${n} out of 10`}
        >
          {n}
        </button>
      ))}
      {value > 0 && (
        <span className="rating-value-label">{value} / 10</span>
      )}
    </div>
  );
}

/** Compact 3-segment badge derived from a 1–10 average */
function TicketBadge({ avg, label }) {
  // Map avg (1-10) to how many of 3 segments are filled
  const filled = avg >= 7 ? 3 : avg >= 4 ? 2 : 1;
  return (
    <span className="movie-rating-badge">
      <span className="ticket-strip-sm" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`ticket-seg-sm ${n <= filled ? 'filled' : ''}`} />
        ))}
      </span>
      {label}
    </span>
  );
}

// ── Main MovieCard ─────────────────────────────────────────────────────────────
export default function MovieCard({
  movie,
  onAdd,
  onRate,
  onReview,
  showActions = false,  // shows add-to-group button (search results)
  showFeedback = false, // shows rate/review controls (group movies)
  ratingsData = null,   // { ratings: [], reviews: [] }
  id,
}) {
  const [expanded, setExpanded] = useState(false);
  const posterSrc = movie.poster_url || movie.poster_path
    ? `${TMDB_IMG}${movie.poster_url || movie.poster_path}`
    : null;

  const year = (movie.release_year || movie.release_date || '').slice(0, 4);

  const avgRating = ratingsData?.ratings?.length
    ? (ratingsData.ratings.reduce((sum, r) => sum + r.rating, 0) / ratingsData.ratings.length).toFixed(1)
    : null;

  return (
    <div className="movie-card fade-in" id={id || `movie-card-${movie.movie_id || movie.id}`}>
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
              style={{ width: '100%' }}
              onClick={() => onAdd && onAdd(movie)}
              id={`add-movie-btn-${movie.id}`}
            >
              Add to Group
            </button>
          </div>
        )}
      </div>

      <div className="movie-info">
        <div className="movie-title" title={movie.title}>{movie.title}</div>
        <div className="movie-info-row">
          <span className="movie-year">{year || '—'}</span>
          {avgRating && (
            <TicketBadge avg={parseFloat(avgRating)} label={avgRating} />
          )}
        </div>

        {showFeedback && (
          <div style={{ marginTop: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', fontSize: 12 }}
              onClick={() => setExpanded(!expanded)}
              id={`expand-movie-btn-${movie.movie_id}`}
            >
              {expanded ? 'Collapse' : 'Rate & Review'}
            </button>
          </div>
        )}
      </div>

      {expanded && showFeedback && (
        <div className="expand-panel">
          {/* Ratings section */}
          <div style={{ marginBottom: 14 }}>
            <div className="panel-section-label">Your Rating</div>
            <RatingInput onSubmit={(val) => onRate && onRate(movie.movie_id, val)} />
          </div>

          {/* Review section */}
          <div style={{ marginBottom: 14 }}>
            <div className="panel-section-label">Your Review</div>
            <ReviewInput onSubmit={(val) => onReview && onReview(movie.movie_id, val)} />
          </div>

          {/* Existing reviews */}
          {ratingsData?.reviews?.length > 0 && (
            <div>
              <div className="panel-section-label">Group Reviews</div>
              {ratingsData.reviews.map((r, i) => (
                <div key={r.review_id || i} className="review-item">
                  <div className="review-header">
                    <span className="review-author">User #{r.user_id}</span>
                  </div>
                  <p className="review-content">{r.content}</p>
                </div>
              ))}
            </div>
          )}

          {/* Ratings summary */}
          {ratingsData?.ratings?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div className="panel-section-label">
                Ratings ({ratingsData.ratings.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ratingsData.ratings.map((r, i) => (
                  <span key={i} className="badge badge-accent">
                    {r.rating}/10
                  </span>
                ))}
              </div>
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

  function handleSubmit() {
    if (selected > 0) {
      onSubmit(selected);
      setSubmitted(true);
    }
  }

  if (submitted) {
    return <div className="alert alert-success" style={{ fontSize: 13 }}>Rating saved!</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TicketStripInput value={selected} onChange={setSelected} />
      {selected > 0 && (
        <button className="btn btn-primary btn-sm" style={{ width: 'fit-content' }} onClick={handleSubmit}>
          Submit Rating
        </button>
      )}
    </div>
  );
}

// ── ReviewInput ───────────────────────────────────────────────────────────────
function ReviewInput({ onSubmit }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setSubmitted(true);
    }
  }

  if (submitted) {
    return <div className="alert alert-success" style={{ fontSize: 13 }}>Review posted!</div>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        className="form-input"
        placeholder="Write your thoughts..."
        value={text}
        onChange={e => setText(e.target.value)}
        style={{ minHeight: 64, fontSize: 13 }}
      />
      {text.trim() && (
        <button type="submit" className="btn btn-primary btn-sm" style={{ width: 'fit-content' }}>
          Post Review
        </button>
      )}
    </form>
  );
}
