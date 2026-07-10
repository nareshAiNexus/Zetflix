/**
 * Zetflix API Client
 * 
 * Central module for all backend API calls.
 * Appends JWT Authorization headers for secured endpoints.
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
const AUTH_API = 'http://localhost:8081/api/v1/auth';
const USER_API = 'http://localhost:8081/api/v1/users';

/**
 * Helper to build headers containing the JWT token from localStorage.
 */
function getHeaders(hasBody = true) {
  const headers = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('userToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ─── Client-Side Password Hashing ────────────────────────────────────
// Passwords are SHA-256 hashed in the browser before being sent over the
// network. The server then BCrypt-hashes the received digest before storing.
// This means the plaintext password NEVER leaves the user's device.
async function hashPassword(plaintext) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Authentication & Profile APIs ───────────────────────────────────

export async function loginUser(email, password) {
  const hashedPassword = await hashPassword(password);
  const res = await fetch(`${AUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: hashedPassword }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function signupUser(name, email, password, dob) {
  const hashedPassword = await hashPassword(password);
  const res = await fetch(`${AUTH_API}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password: hashedPassword, dob }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Signup failed (${res.status})`);
  }
  return res.text();
}

export async function verifyEmail(email, otp) {
  const res = await fetch(`${AUTH_API}/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `OTP verification failed (${res.status})`);
  }
  return res.text();
}

export async function resendOtp(email) {
  const res = await fetch(`${AUTH_API}/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Resend OTP failed (${res.status})`);
  }
  return res.text();
}

export async function forgotPassword(email) {
  const res = await fetch(`${AUTH_API}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.text();
}

export async function resetPassword(token, password) {
  const hashedPassword = await hashPassword(password);
  const res = await fetch(`${AUTH_API}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password: hashedPassword }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to reset password');
  }
  return res.text();
}

export async function fetchUserProfile() {
  const res = await fetch(`${USER_API}/profile`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error(`Failed to fetch user profile: ${res.status}`);
  return res.json();
}

export async function updateUserProfile(name, dob) {
  const res = await fetch(`${USER_API}/profile`, {
    method: 'PUT',
    headers: getHeaders(true),
    body: JSON.stringify({ name, dob }),
  });
  if (!res.ok) throw new Error(`Failed to update profile: ${res.status}`);
  return res.text();
}

// ─── Content Service (port 8081) ────────────────────────────────────

export async function fetchAllMovies() {
  const res = await fetch(CONTENT_API, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error(`Failed to fetch movies: ${res.status}`);
  return res.json();
}

export async function fetchMovieById(movieId) {
  const res = await fetch(`${CONTENT_API}/${movieId}`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error(`Failed to fetch movie ${movieId}: ${res.status}`);
  return res.json();
}

export async function fetchMoviesByGenre(genre) {
  const res = await fetch(`${CONTENT_API}/genre/${genre}`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error(`Failed to fetch movies by genre ${genre}: ${res.status}`);
  return res.json();
}

export async function searchMovies(title) {
  const res = await fetch(`${CONTENT_API}/search?title=${encodeURIComponent(title)}`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

export async function createMovie(movieData) {
  const res = await fetch(CONTENT_API, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify(movieData),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to create movie: ${res.status} — ${errBody}`);
  }
  return res.json();
}

// ─── Watch Playback Progress (MySQL / Port 8081) ───────────────────

export async function fetchWatchProgress(movieId) {
  const res = await fetch(`${CONTENT_API}/${movieId}/watch-progress`, {
    headers: getHeaders(false),
  });
  if (!res.ok) throw new Error(`Failed to fetch playback progress: ${res.status}`);
  return res.json();
}

export async function updateWatchProgress(movieId, lastWatchedTimeSeconds, totalDurationSeconds) {
  const res = await fetch(`${CONTENT_API}/${movieId}/watch-progress`, {
    method: 'POST',
    headers: getHeaders(true),
    body: JSON.stringify({ lastWatchedTimeSeconds, totalDurationSeconds }),
  });
  if (!res.ok) throw new Error(`Failed to save playback progress: ${res.status}`);
  return res;
}

// ─── Video Service (port 8082) ──────────────────────────────────────

export function uploadVideo(movieId, file, onProgress, signal) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${VIDEO_API}/upload/${movieId}`;

    xhr.open('POST', url);

    // Attach JWT Bearer token
    const token = localStorage.getItem('userToken');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

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

export async function getStreamingInfo(movieId) {
  const res = await fetch(`${STREAM_API}/${movieId}`, {
    headers: getHeaders(false),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to get streaming info: ${res.status}`);
  return res.json();
}

/**
 * Fetch real-time encoding progress during movie upload (Transient / No Auth needed)
 */
export async function fetchEncodingProgress(movieId) {
  const res = await fetch(`${CONTENT_API}/${movieId}/progress`);
  if (!res.ok) throw new Error(`Failed to fetch encoding progress: ${res.status}`);
  return res.json();
}
