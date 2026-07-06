/**
 * Zetflix API Client
 * 
 * Central module for all backend API calls.
 * Uses direct URLs since all backends have @CrossOrigin(origins = "*").
 * 
 * Service ports:
 *   Content Service: 8081
 *   Video Service:   8082
 *   Encoding Service: 8083 (not called from frontend)
 *   Streaming Service: 8084
 */

const CONTENT_API = 'http://localhost:8081/api/v1/movies';
const VIDEO_API = 'http://localhost:8082/api/v1/videos';
const STREAM_API = 'http://localhost:8084/api/v1/stream';

// ─── Content Service (port 8081) ────────────────────────────────────

/**
 * Fetch all movies from the catalog.
 * GET /api/v1/movies
 * @returns {Promise<Array>} List of MovieResponse objects
 */
export async function fetchAllMovies() {
  const res = await fetch(CONTENT_API);
  if (!res.ok) throw new Error(`Failed to fetch movies: ${res.status}`);
  return res.json();
}

/**
 * Fetch a single movie by ID.
 * GET /api/v1/movies/{movieId}
 * @param {string} movieId 
 * @returns {Promise<Object>} MovieResponse
 */
export async function fetchMovieById(movieId) {
  const res = await fetch(`${CONTENT_API}/${movieId}`);
  if (!res.ok) throw new Error(`Failed to fetch movie ${movieId}: ${res.status}`);
  return res.json();
}

/**
 * Fetch movies by genre.
 * GET /api/v1/movies/genre/{genre}
 * @param {string} genre - One of: ACTION, COMEDY, DRAMA, HORROR, ROMANCE, THRILLER, DOCUMENTARY, ANIME, SCI_FI
 * @returns {Promise<Array>} List of MovieResponse objects
 */
export async function fetchMoviesByGenre(genre) {
  const res = await fetch(`${CONTENT_API}/genre/${genre}`);
  if (!res.ok) throw new Error(`Failed to fetch movies by genre ${genre}: ${res.status}`);
  return res.json();
}

/**
 * Search movies by title.
 * GET /api/v1/movies/search?title=...
 * @param {string} title 
 * @returns {Promise<Array>} List of MovieResponse objects
 */
export async function searchMovies(title) {
  const res = await fetch(`${CONTENT_API}/search?title=${encodeURIComponent(title)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

/**
 * Create a new movie entry in the catalog.
 * POST /api/v1/movies
 * 
 * Backend sets videoStatus = PENDING automatically.
 * 
 * @param {Object} movieData - Fields matching MovieRequest DTO:
 *   { title, description, genre, director, cast, releaseYear, rating, thumbnailUrl, durationMinutes }
 * @returns {Promise<Object>} MovieResponse with generated `id` (movieId)
 */
export async function createMovie(movieData) {
  const res = await fetch(CONTENT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(movieData),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to create movie: ${res.status} — ${errBody}`);
  }
  return res.json();
}

// ─── Video Service (port 8082) ──────────────────────────────────────

/**
 * Upload a video file for a movie.
 * POST /api/v1/videos/upload/{movieId}
 * 
 * Uses XMLHttpRequest instead of fetch to support upload progress events.
 * 
 * @param {string} movieId 
 * @param {File} file - The video file
 * @param {function} onProgress - Callback: (percentComplete: number) => void
 * @param {AbortSignal} [signal] - Optional AbortSignal to cancel the upload
 * @returns {Promise<string>} Success message from the server
 */
export function uploadVideo(movieId, file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${VIDEO_API}/upload/${movieId}`;

    xhr.open('POST', url);

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percent = Math.round((e.loaded / e.total) * 100);
        onProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} — ${xhr.responseText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: network error'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Support cancellation via AbortSignal
    if (signal) {
      signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    const formData = new FormData();
    formData.append('file', file);

    xhr.send(formData);
  });
}

// ─── Streaming Service (port 8084) ──────────────────────────────────

/**
 * Get streaming info for a movie.
 * GET /api/v1/stream/{movieId}
 * 
 * Returns:
 *   { movieId, streamingURL, quality, expiredInMinutes }
 * 
 * Also used for polling encoding status — returns 404 if not ready yet.
 * 
 * @param {string} movieId 
 * @returns {Promise<Object|null>} StreamingResponse or null if not found/ready
 */
export async function getStreamingInfo(movieId) {
  const res = await fetch(`${STREAM_API}/${movieId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to get streaming info: ${res.status}`);
  return res.json();
}
