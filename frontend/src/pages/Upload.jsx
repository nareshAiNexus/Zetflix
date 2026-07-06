import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMovie, uploadVideo, fetchMovieById } from '../api/api';
import useMovieStore from '../store/useMovieStore';
import './Upload.css';

// Must match the backend Genre enum exactly
const GENRES = [
  'ACTION', 'COMEDY', 'DRAMA', 'HORROR', 'ROMANCE',
  'THRILLER', 'DOCUMENTARY', 'ANIME', 'SCI_FI'
];

// Human-readable labels for genre enum values
const GENRE_LABELS = {
  ACTION: 'Action', COMEDY: 'Comedy', DRAMA: 'Drama',
  HORROR: 'Horror', ROMANCE: 'Romance', THRILLER: 'Thriller',
  DOCUMENTARY: 'Documentary', ANIME: 'Anime', SCI_FI: 'Sci-Fi'
};

// Must match the backend VideoStatus enum
const STATUS_INFO = {
  PENDING:  { label: 'Pending Upload', icon: '⏳', color: '#f59e0b' },
  UPLOADED: { label: 'Uploaded — Waiting for Encoding', icon: '☁️', color: '#3b82f6' },
  ENCODING: { label: 'Encoding in Progress...', icon: '⚙️', color: '#8b5cf6' },
  ENCODED:  { label: 'Encoding Complete', icon: '✅', color: '#10b981' },
  READY:    { label: 'Ready to Stream!', icon: '🎬', color: '#22c55e' },
  FAILED:   { label: 'Encoding Failed', icon: '❌', color: '#ef4444' },
};

const Upload = () => {
  const navigate = useNavigate();
  const fetchMovies = useMovieStore(s => s.fetchMovies);
  const pendingMovies = useMovieStore(s => s.getPendingMovies());

  // ─── Form State ───────────────────────────────────────────────
  const [formData, setFormData] = useState({
    title: '', description: '', genre: '', director: '',
    cast: '', releaseYear: '', thumbnailUrl: '', durationMinutes: '',
  });
  const [videoFile, setVideoFile] = useState(null);

  // ─── Flow State ───────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1=form, 2=upload, 3=polling
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [movieId, setMovieId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState(null);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // For cancelling upload
  const abortControllerRef = useRef(null);
  const pollingRef = useRef(null);

  // Load pending movies on mount
  useEffect(() => {
    fetchMovies(true);
  }, [fetchMovies]);

  // ─── Tab Close Protection ────────────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (step === 2 || step === 3) {
        e.preventDefault();
        e.returnValue = 'Leaving will stop the upload — continue or cancel?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ─── Handlers ─────────────────────────────────────────────────

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setVideoFile(file);
  };

  /**
   * Step 1: Submit movie metadata to create a movie entry.
   */
  const handleCreateMovie = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        genre: formData.genre,
        director: formData.director || null,
        cast: formData.cast || null,
        releaseYear: parseInt(formData.releaseYear, 10),
        rating: 0.0, // Default — IMDB rating can be updated later
        thumbnailUrl: formData.thumbnailUrl || null,
        durationMinutes: parseInt(formData.durationMinutes, 10),
      };

      const movie = await createMovie(payload);
      setMovieId(movie.id);
      setStep(2);
      setSuccessMsg(`Movie "${movie.title}" created! Now upload the video file.`);

      // Refresh movie list so pending movies update
      fetchMovies(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Step 2: Upload video file for the created movie.
   */
  const handleUploadVideo = async () => {
    if (!videoFile) {
      setError('Please select a video file.');
      return;
    }

    setError('');
    setUploadProgress(0);
    abortControllerRef.current = new AbortController();

    try {
      await uploadVideo(
        movieId,
        videoFile,
        (percent) => setUploadProgress(percent),
        abortControllerRef.current.signal
      );

      setSuccessMsg('Video uploaded! Encoding has started automatically.');
      setStep(3);
      setVideoStatus('UPLOADED');
      startPolling(movieId);
    } catch (err) {
      if (err.message === 'Upload cancelled') {
        setError('Upload was cancelled. The movie remains in PENDING state.');
        setStep(1);
        fetchMovies(true);
      } else {
        setError(err.message);
      }
    }
  };

  /**
   * Cancel an in-progress upload.
   */
  const handleCancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  /**
   * Step 3: Poll the content-service for video status updates.
   * We poll the movie endpoint directly since streaming endpoint
   * returns 404 until the movie is READY.
   */
  const startPolling = useCallback((mId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const movie = await fetchMovieById(mId);
        setVideoStatus(movie.videoStatus);

        if (movie.videoStatus === 'READY') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setSuccessMsg('🎬 Movie is ready to stream! Redirecting to homepage...');
          // Refresh global movie list
          fetchMovies(true);
          setTimeout(() => navigate('/'), 3000);
        } else if (movie.videoStatus === 'FAILED') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setError('Encoding failed. Please try uploading again.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 5000);
  }, [fetchMovies, navigate]);

  /**
   * Resume upload for a pending movie (from the pending list).
   */
  const handleResumePending = (movie) => {
    setMovieId(movie.id);
    setFormData({
      title: movie.title, description: movie.description || '',
      genre: movie.genre || '', director: movie.director || '',
      cast: movie.cast || '', releaseYear: movie.releaseYear?.toString() || '',
      thumbnailUrl: movie.thumbnailUrl || '',
      durationMinutes: movie.durationMinutes?.toString() || '',
    });
    setStep(2);
    setSuccessMsg(`Resuming upload for "${movie.title}". Select a video file.`);
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="page-container upload-page">
      <div className="upload-page-header">
        <h2>Upload Movie</h2>
        <p className="upload-subtitle">Share your movies with everyone on Zetflix.</p>
      </div>

      {/* ── Step Indicator ── */}
      <div className="step-indicator">
        <div className={`step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
          <span>Movie Details</span>
        </div>
        <div className="step-line" />
        <div className={`step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
          <span>Upload Video</span>
        </div>
        <div className="step-line" />
        <div className={`step-item ${step >= 3 ? 'active' : ''}`}>
          <div className="step-circle">3</div>
          <span>Processing</span>
        </div>
      </div>

      {/* ── Messages ── */}
      {error && <div className="upload-message error">{error}</div>}
      {successMsg && <div className="upload-message success">{successMsg}</div>}

      {/* ── Step 1: Movie Details Form ── */}
      {step === 1 && (
        <form className="upload-form" onSubmit={handleCreateMovie}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="upload-title">Movie Title *</label>
              <input id="upload-title" type="text" name="title" placeholder="e.g. Inception"
                value={formData.title} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label htmlFor="upload-genre">Genre *</label>
              <select id="upload-genre" name="genre" value={formData.genre}
                onChange={handleInputChange} required>
                <option value="">Select Genre</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{GENRE_LABELS[g]}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="upload-year">Release Year *</label>
              <input id="upload-year" type="number" name="releaseYear" placeholder="e.g. 2024"
                value={formData.releaseYear} onChange={handleInputChange} required
                min="1900" max="2030" />
            </div>

            <div className="form-group">
              <label htmlFor="upload-duration">Duration (minutes) *</label>
              <input id="upload-duration" type="number" name="durationMinutes" placeholder="e.g. 148"
                value={formData.durationMinutes} onChange={handleInputChange} required min="1" />
            </div>

            <div className="form-group">
              <label htmlFor="upload-director">Director</label>
              <input id="upload-director" type="text" name="director" placeholder="e.g. Christopher Nolan"
                value={formData.director} onChange={handleInputChange} />
            </div>

            <div className="form-group full-width">
              <label htmlFor="upload-cast">Cast</label>
              <input id="upload-cast" type="text" name="cast"
                placeholder="e.g. Leonardo DiCaprio, Elliot Page"
                value={formData.cast} onChange={handleInputChange} />
            </div>

            <div className="form-group full-width">
              <label htmlFor="upload-thumbnail">Thumbnail URL</label>
              <input id="upload-thumbnail" type="url" name="thumbnailUrl"
                placeholder="https://example.com/poster.jpg"
                value={formData.thumbnailUrl} onChange={handleInputChange} />
            </div>

            <div className="form-group full-width">
              <label htmlFor="upload-desc">Description</label>
              <textarea id="upload-desc" name="description" rows="4"
                placeholder="A brief synopsis of the movie..."
                value={formData.description} onChange={handleInputChange} />
            </div>

            {/* Pre-select the video file in step 1 for convenience */}
            <div className="form-group full-width">
              <label htmlFor="upload-file">Video File</label>
              <div className="file-drop-zone">
                <input id="upload-file" type="file" accept="video/*"
                  onChange={handleFileChange} className="file-input-hidden" />
                <label htmlFor="upload-file" className="file-drop-label">
                  {videoFile ? (
                    <span className="file-selected">
                      🎥 {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  ) : (
                    <span>
                      <span className="file-icon">📂</span>
                      <span>Click to select or drag a video file</span>
                    </span>
                  )}
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="upload-btn primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <><span className="spinner" /> Creating Movie...</>
            ) : (
              'Create Movie & Continue'
            )}
          </button>
        </form>
      )}

      {/* ── Step 2: Video Upload ── */}
      {step === 2 && (
        <div className="upload-step-content">
          <div className="upload-video-section">
            <h3>Upload Video for: <em>{formData.title}</em></h3>

            {!videoFile && (
              <div className="file-drop-zone large">
                <input id="upload-file-step2" type="file" accept="video/*"
                  onChange={handleFileChange} className="file-input-hidden" />
                <label htmlFor="upload-file-step2" className="file-drop-label">
                  <span className="file-icon large">🎬</span>
                  <span>Select a video file to upload</span>
                  <span className="file-hint">Supported formats: MP4, MOV, AVI, MKV (max 2GB)</span>
                </label>
              </div>
            )}

            {videoFile && uploadProgress === 0 && (
              <div className="file-ready">
                <div className="file-info">
                  <span className="file-icon">🎥</span>
                  <div>
                    <p className="file-name">{videoFile.name}</p>
                    <p className="file-size">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                </div>
                <div className="upload-actions">
                  <button className="upload-btn primary" onClick={handleUploadVideo}>
                    Upload Video
                  </button>
                  <button className="upload-btn secondary" onClick={() => setVideoFile(null)}>
                    Change File
                  </button>
                </div>
              </div>
            )}

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="upload-progress-section">
                <div className="progress-header">
                  <span>Uploading to S3...</span>
                  <span className="progress-percent">{uploadProgress}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <button className="upload-btn danger" onClick={handleCancelUpload}>
                  Cancel Upload
                </button>
              </div>
            )}

            {uploadProgress === 100 && step === 2 && (
              <div className="upload-complete-msg">
                <span className="spinner" /> Finalizing upload...
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Encoding Status Polling ── */}
      {step === 3 && (
        <div className="upload-step-content">
          <div className="encoding-status-section">
            <h3>Processing Your Video</h3>
            <p className="encoding-desc">
              Your video is being processed by our encoding pipeline.
              This may take several minutes depending on the file size.
            </p>

            <div className="status-pipeline">
              {['UPLOADED', 'ENCODING', 'ENCODED', 'READY'].map((status) => {
                const info = STATUS_INFO[status];
                const statusOrder = ['UPLOADED', 'ENCODING', 'ENCODED', 'READY'];
                const currentIdx = statusOrder.indexOf(videoStatus);
                const thisIdx = statusOrder.indexOf(status);
                const isActive = thisIdx === currentIdx;
                const isCompleted = thisIdx < currentIdx;

                return (
                  <div key={status}
                    className={`status-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    <div className="status-icon" style={{
                      borderColor: isActive || isCompleted ? info.color : '#333',
                      background: isCompleted ? info.color : 'transparent',
                    }}>
                      {isCompleted ? '✓' : info.icon}
                    </div>
                    <span className="status-label" style={{
                      color: isActive ? info.color : isCompleted ? '#888' : '#555',
                    }}>
                      {info.label}
                    </span>
                    {isActive && <div className="status-pulse" style={{ borderColor: info.color }} />}
                  </div>
                );
              })}
            </div>

            {videoStatus === 'FAILED' && (
              <button className="upload-btn primary" onClick={() => { setStep(1); setError(''); }}>
                Try Again
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Pending Movies (need video upload) ── */}
      {pendingMovies.length > 0 && step === 1 && (
        <div className="pending-section">
          <h3>Pending Uploads</h3>
          <p className="pending-desc">These movies need a video file uploaded:</p>
          <div className="pending-grid">
            {pendingMovies.map(movie => (
              <div key={movie.id} className="pending-card">
                <div className="pending-thumb"
                  style={{ backgroundImage: movie.thumbnailUrl ? `url(${movie.thumbnailUrl})` : 'none' }}>
                  {!movie.thumbnailUrl && <span className="no-thumb">🎞️</span>}
                </div>
                <div className="pending-info">
                  <h4>{movie.title}</h4>
                  <p>{movie.releaseYear} • {GENRE_LABELS[movie.genre] || movie.genre}</p>
                  <span className="pending-badge">
                    {STATUS_INFO.PENDING.icon} {STATUS_INFO.PENDING.label}
                  </span>
                </div>
                <button className="upload-btn small" onClick={() => handleResumePending(movie)}>
                  Upload Video
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Upload;
