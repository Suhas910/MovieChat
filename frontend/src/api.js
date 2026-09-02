const BASE_URL = 'https://moviechat-api.onrender.com';

async function request(path, { method = 'GET', body, token, queryParams } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Build URL — use raw string concatenation for paths with special chars like &
  let url = `${BASE_URL}${path}`;
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || `Request failed: ${res.status}`);
  }

  return res.status === 204 ? null : res.json();
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  register: (username, email, password) =>
    request('/register', { method: 'POST', body: { username, email, password } }),

  login: (username, password) =>
    request('/login', { method: 'POST', body: { username, password } }),

  // ── Groups ─────────────────────────────────────────────────────────────────
  // Returns: [{ group_id: int, name: string }, ...]
  myGroups: (token) =>
    request('/my_groups', { token }),

  // Returns the new group object: { group_id, name, created_by }
  createGroup: (name, token) =>
    request('/create_group', { method: 'POST', body: { name }, token }),

  // POST /groups/{group_id}/add-member?username=...  (admin only)
  addMember: (groupId, username, token) =>
    request(`/groups/${groupId}/add-member`, {
      method: 'POST',
      queryParams: { username },
      token,
    }),

  // ── Movies ─────────────────────────────────────────────────────────────────
  // GET /groups/{group_id}/popular_movies  → TMDB popular list
  popularMovies: (groupId, token) =>
    request(`/groups/${groupId}/popular_movies`, { token }),

  // GET /groups/{group_id}/movies/{query}  → single TMDB result (first match)
  searchMovie: (groupId, query, token) =>
    request(`/groups/${groupId}/movies/${encodeURIComponent(query)}`, { token }),

  // POST /groups/{group_id}/movies/{query}  → adds that movie to the group
  addMovie: (groupId, query, token) =>
    request(`/groups/${groupId}/movies/${encodeURIComponent(query)}`, {
      method: 'POST',
      token,
    }),

  // GET /groups/{group_id}/movies  → all movies saved in the group
  // Returns: [{ movie_id, tmdb_id, title, poster_url, desc, release_year, group_id, added_by }, ...]
  groupMovies: (groupId, token) =>
    request(`/groups/${groupId}/movies`, { token }),

  // ── Ratings ─────────────────────────────────────────────────────────────────
  // POST /groups/{group_id}/movies/{movie_id}/add-rating  body: { rating: 1-10 }
  // Upserts: updates existing rating if user already rated
  addRating: (groupId, movieId, rating, token) =>
    request(`/groups/${groupId}/movies/${movieId}/add-rating`, {
      method: 'POST',
      body: { rating },
      token,
    }),

  // ── Reviews ──────────────────────────────────────────────────────────────────
  // POST /groups/{group_id}/movies/{movie_id}/add-review?user_review=...
  addReview: (groupId, movieId, content, token) =>
    request(`/groups/${groupId}/movies/${movieId}/add-review`, {
      method: 'POST',
      queryParams: { user_review: content },
      token,
    }),

  // GET /groups/{group_id}/movies/{movie_id}/rating&review
  // The & is a literal character in the URL path — not a query separator
  // Returns: { ratings: [...], reviews: [...] }
  ratingsAndReviews: (groupId, movieId, token) =>
    request(`/groups/${groupId}/movies/${movieId}/rating&review`, { token }),
};
