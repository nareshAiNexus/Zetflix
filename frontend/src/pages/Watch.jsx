import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Hls from 'hls.js';
import { getStreamingInfo, fetchAllMovies, fetchWatchProgress, updateWatchProgress, fetchMovieById } from '../api/api';
import './Watch.css';

const Watch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeMovieId } = useParams();
  
  const [movie, setMovie] = useState(location.state?.movie || { title: 'Loading...', id: routeMovieId || '' });
  
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const progressContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const fileInputRef = useRef(null);

  // ─── Playback States ──────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const [durationStr, setDurationStr] = useState('0:00');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1.0);
  const [showControls, setShowControls] = useState(true);

  // ─── Subtitle & Speed States ──────────────────────────────────
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activeSettingsTab, setActiveSettingsTab] = useState('main'); // 'main', 'quality', 'speed', 'subtitles', 'subtitle-styles'
  const [successMsg, setSuccessMsg] = useState('');
  const [subtitleSize, setSubtitleSize] = useState('1.1rem');
  const [subtitleColor, setSubtitleColor] = useState('#ffffff');
  const [subtitleBg, setSubtitleBg] = useState('rgba(0, 0, 0, 0.7)');
  const [subtitleX, setSubtitleX] = useState(0);
  const [subtitleY, setSubtitleY] = useState(0);
  const [subtitleLineHeight, setSubtitleLineHeight] = useState(1.2);

  // ─── Other Movies State ───────────────────────────────────────
  const [otherMovies, setOtherMovies] = useState([]);

  // ─── API & HLS States ─────────────────────────────────────────
  const [streamingUrl, setStreamingUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [qualities, setQualities] = useState([]); // [{ index: number, height: number }]
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1); // -1 = Auto
  const [showSettings, setShowSettings] = useState(false);

  // Load movie metadata dynamically if location state is missing
  useEffect(() => {
    const loadMovieMetadata = async () => {
      if ((!movie.title || movie.title === 'Loading...') && routeMovieId) {
        try {
          const data = await fetchMovieById(routeMovieId);
          setMovie({
            id: data.id,
            title: data.title,
            imageUrl: data.thumbnailUrl,
            hlsUrl: data.hlsUrl,
            videoStatus: data.videoStatus
          });
        } catch (err) {
          console.error("Failed to load movie details:", err);
          setError("Failed to load movie metadata.");
        }
      }
    };
    loadMovieMetadata();
  }, [routeMovieId, movie.title]);

  // Format time in seconds to M:SS or H:MM:SS
  const formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const initialTimeRef = useRef(0);

  // Parse time parameter from URL query string if present
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const timeParam = queryParams.get('t');
    if (timeParam) {
      const time = parseFloat(timeParam);
      if (!isNaN(time) && time > 0) {
        initialTimeRef.current = time;
      }
    }
  }, [location.search]);

  // Fetch watch progress from DB fallback
  useEffect(() => {
    const loadProgress = async () => {
      if (!movie.id || initialTimeRef.current > 0) return; // skip if already parsed from URL
      try {
        const progressData = await fetchWatchProgress(movie.id);
        if (progressData && progressData.status === 'FOUND' && progressData.watchedTimeSeconds > 0) {
          initialTimeRef.current = progressData.watchedTimeSeconds;
          
          // Seek immediately if video metadata is already loaded
          const video = videoRef.current;
          if (video && video.duration && video.duration > initialTimeRef.current) {
            video.currentTime = initialTimeRef.current;
          }
        }
      } catch (err) {
        console.warn('Failed to load watch progress:', err);
      }
    };
    loadProgress();
  }, [movie.id]);

  // Auto save progress periodically and on unmount
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movie.id) return;

    const saveProgress = () => {
      // Only save if we have a valid timestamp and duration (video is actually loaded)
      if (video.currentTime > 5 && video.duration > 0 && isFinite(video.duration)) {
        updateWatchProgress(movie.id, Math.floor(video.currentTime), Math.floor(video.duration))
          .catch(err => console.warn('Failed to save watch progress:', err));
      }
    };

    // Save every 10 seconds while playing
    const intervalId = setInterval(() => {
      if (!video.paused) saveProgress();
    }, 10000);

    // Save immediately when user pauses
    video.addEventListener('pause', saveProgress);

    return () => {
      clearInterval(intervalId);
      video.removeEventListener('pause', saveProgress);
      // Save on exit/unmount
      saveProgress();
    };
  }, [movie.id]);

  // Fetch Streaming Info on Mount
  useEffect(() => {
    const fetchStream = async () => {
      if (!movie.id) {
        setError('No movie ID provided.');
        setIsLoading(false);
        return;
      }
      try {
        const data = await getStreamingInfo(movie.id);
        if (data && (data.streamingURL || data.streamingUrl)) {
          setStreamingUrl(data.streamingURL || data.streamingUrl);
        } else {
          setError('This movie is not ready for streaming yet.');
        }
      } catch (err) {
        setError('Failed to fetch stream details: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStream();
  }, [movie.id]);

  // Fetch Other Movies on Mount
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const data = await fetchAllMovies();
        // Filter out the current movie and ensure they are ready to stream
        const filtered = data.filter(m => m.id !== movie.id && m.videoStatus === 'READY');
        setOtherMovies(filtered);
      } catch (err) {
        console.error('Failed to fetch other movies:', err);
      }
    };
    fetchMovies();
  }, [movie.id]);

  const playMovie = (selectedMovie) => {
    navigate('/watch', { state: { movie: selectedMovie } });
  };

  // HLS Setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamingUrl) return;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        maxBufferLength: 10,
        maxMaxBufferLength: 20,
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr, url) => {
          let requestUrl = url;
          // If request is for a playlist path from the S3 bucket, sign it through streaming service
          if (url.includes('.m3u8') && !url.includes('X-Amz')) {
            const bucketUrlPart = '.amazonaws.com/';
            let path = url;
            if (url.includes(bucketUrlPart)) {
              path = url.split(bucketUrlPart)[1];
            }
            const encodedPath = encodeURIComponent(path);
            requestUrl = `http://localhost:8084/api/v1/stream/${movie.id}/playlist?path=${encodedPath}`;
            xhr.open('GET', requestUrl);
          }
          
          // Add JWT Bearer token for all streaming calls to localhost:8084
          if (requestUrl.includes('localhost:8084') || requestUrl.includes('/api/v1/stream')) {
            const token = localStorage.getItem('userToken');
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          }
        }
      });

      hlsRef.current = hls;
      hls.loadSource(streamingUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        const levels = hls.levels.map((level, idx) => ({
          index: idx,
          height: level.height
        }));
        setQualities(levels);
        if (initialTimeRef.current > 0) {
          video.currentTime = initialTimeRef.current;
        }
        if (isPlaying) {
          video.play().catch(e => console.log('Autoplay blocked:', e));
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal unrecoverable HLS error');
              setError('Failed to play the video stream.');
              hls.destroy();
              break;
          }
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback for native HLS (Safari/iOS)
      video.src = streamingUrl;
      if (initialTimeRef.current > 0) {
        video.currentTime = initialTimeRef.current;
      }
      if (isPlaying) {
        video.play().catch(e => console.log('Autoplay blocked:', e));
      }
    } else {
      setError('HLS streaming is not supported by your browser.');
    }
  }, [streamingUrl, movie.id]);

  // Dynamic track tag loader to force browser track parsing
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Clear existing track elements
    const existingTracks = video.querySelectorAll('track');
    existingTracks.forEach(t => t.remove());

    if (subtitleUrl) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'Uploaded Subtitles';
      track.srclang = 'en';
      track.src = subtitleUrl;
      track.default = true;

      video.appendChild(track);

      // Force track visibility state in TextTrackList
      const textTracks = video.textTracks;
      if (textTracks && textTracks.length > 0) {
        textTracks[0].mode = subtitlesEnabled ? 'showing' : 'disabled';
      }
    }
  }, [subtitleUrl, subtitlesEnabled]);

  // ─── Playback Controls ────────────────────────────────────────

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
        if (video.currentTime > 0 && video.duration > 0) {
          updateWatchProgress(movie.id, video.currentTime, video.duration)
            .catch(err => console.error('Failed to save progress on pause:', err));
        }
      } else {
        video.play().catch(e => console.error(e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      const current = video.currentTime;
      const duration = video.duration;
      setCurrentTimeStr(formatTime(current));
      if (duration > 0) {
        setProgress((current / duration) * 100);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDurationStr(formatTime(video.duration));
      if (initialTimeRef.current > 0 && initialTimeRef.current < video.duration) {
        video.currentTime = initialTimeRef.current;
        initialTimeRef.current = 0; // Clear so we don't repeat
      }
    }
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    if (progressContainerRef.current && video && video.duration) {
      const rect = progressContainerRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      video.currentTime = pos * video.duration;
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      const nextMuted = !isMuted;
      video.muted = nextMuted;
      setIsMuted(nextMuted);
      if (nextMuted) {
        video.volume = 0;
      } else {
        video.volume = volume;
      }
    }
  };

  const handleVolumeChange = (e) => {
    const nextVol = parseFloat(e.target.value);
    setVolume(nextVol);
    const video = videoRef.current;
    if (video) {
      video.volume = nextVol;
      const nextMuted = nextVol === 0;
      video.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const skipTime = (seconds) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      } else {
        alert("Picture-in-Picture is not supported in this browser.");
      }
    } catch (err) {
      console.error("Failed to toggle Picture-in-Picture", err);
    }
  };

  const convertSrtToVtt = (srtText) => {
    let vtt = "WEBVTT\n\n" + srtText;
    vtt = vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    return vtt;
  };

  const handleSubtitleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      let text = event.target.result;
      if (file.name.endsWith('.srt')) {
        text = convertSrtToVtt(text);
      }
      const blob = new Blob([text], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      setSubtitleUrl(url);
      setSubtitlesEnabled(true);
      setSuccessMsg('Subtitles loaded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    };
    reader.readAsText(file);
  };

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Show controls on any keyboard activity
      setShowControls(true);
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.min(1.0, prev + 0.1);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = false;
            }
            setIsMuted(false);
            return next;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => {
            const next = Math.max(0.0, prev - 0.1);
            if (videoRef.current) {
              videoRef.current.volume = next;
              videoRef.current.muted = next === 0;
            }
            setIsMuted(next === 0);
            return next;
          });
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            e.preventDefault();
            if (document.exitFullscreen) {
              document.exitFullscreen();
            }
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume, isFullscreen]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (playerContainerRef.current.requestFullscreen) {
        playerContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls Auto-Hide Logic
  useEffect(() => {
    let timeoutId;
    const startTimeout = (delay = 3000) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (isPlaying && !showSettings) {
          setShowControls(false);
        }
      }, delay);
    };

    const handleMouseMove = () => {
      setShowControls(true);
      startTimeout(3000);
    };

    setShowControls(true);
    window.addEventListener('mousemove', handleMouseMove);
    
    // If user plays the video (e.g. by pressing Space), start a 5-second auto-hide countdown
    if (isPlaying) {
      startTimeout(5000);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isPlaying, showSettings]);

  const cycleSubtitleSize = () => {
    const sizes = ['0.8rem', '1.1rem', '1.4rem', '1.8rem'];
    const idx = sizes.indexOf(subtitleSize);
    const nextIdx = (idx + 1) % sizes.length;
    setSubtitleSize(sizes[nextIdx]);
  };

  const cycleSubtitleColor = () => {
    const colors = ['#ffffff', '#ffff00', '#00ffff', '#00ff00'];
    const idx = colors.indexOf(subtitleColor);
    const nextIdx = (idx + 1) % colors.length;
    setSubtitleColor(colors[nextIdx]);
  };

  const cycleSubtitleBg = () => {
    const bgs = ['rgba(0, 0, 0, 0.7)', 'rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0)'];
    const idx = bgs.indexOf(subtitleBg);
    const nextIdx = (idx + 1) % bgs.length;
    setSubtitleBg(bgs[nextIdx]);
  };

  const adjustLineHeight = (amount) => {
    setSubtitleLineHeight(prev => parseFloat(Math.max(0.6, Math.min(2.5, prev + amount)).toFixed(1)));
  };

  const adjustY = (amount) => {
    setSubtitleY(prev => Math.max(-500, Math.min(200, prev + amount)));
  };

  const adjustX = (amount) => {
    setSubtitleX(prev => Math.max(-500, Math.min(500, prev + amount)));
  };

  const selectQuality = (index) => {
    setCurrentQualityIndex(index);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
    setShowSettings(false);
  };

  return (
    <div 
      className={`watch-page ${showControls ? '' : 'hide-cursor'}`} 
      style={{ 
        cursor: showControls ? 'default' : 'none',
        '--subtitle-color': subtitleColor,
        '--subtitle-size': subtitleSize,
        '--subtitle-bg': subtitleBg,
        '--subtitle-x': `${subtitleX}px`,
        '--subtitle-y': `${subtitleY}px`,
        '--subtitle-line-height': subtitleLineHeight
      }}
    >
      {/* Blurred background */}
      <div 
        className="watch-background" 
        style={{ backgroundImage: `url(${movie.imageUrl || 'https://images.unsplash.com/photo-1596727147705-61a532a659bd?q=80&w=2000'})` }}
      />

      {/* Fixed Player Wrapper */}
      <div className={`fixed-player-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
        {isLoading ? (
          <div className="loader-container">
            <div className="spinner" style={{ width: '50px', height: '50px', borderThickness: '4px' }} />
            <p style={{ marginTop: '20px' }}>Fetching secure video stream...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <h3 style={{ color: '#ef4444', marginBottom: '15px' }}>Playback Error</h3>
            <p>{error}</p>
            <button className="upload-btn primary" style={{ marginTop: '20px' }} onClick={() => navigate(-1)}>
              Go Back
            </button>
          </div>
        ) : (
          <div className="player-container" ref={playerContainerRef}>
            <video 
              ref={videoRef}
              className="real-video-player"
              autoPlay 
              style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            
            {successMsg && (
              <div className="player-toast">
                {successMsg}
              </div>
            )}

            {!isPlaying && (
              <div className="center-play-btn" onClick={togglePlay}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            )}

            {/* Back button overlay on top left of the fixed player */}
            {!isFullscreen && (
              <button className="back-btn-overlay" onClick={() => navigate(-1)} title="Go Back">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                <span>Back</span>
              </button>
            )}

            {/* Movie Title overlay on top center of the fixed player */}
            {!isFullscreen && (
              <div className="now-watching-overlay">
                Now Watching: {movie.title}
              </div>
            )}

            {/* Scroll down indicator */}
            {!isFullscreen && otherMovies.length > 0 && (
              <div className="scroll-indicator">
                <span>Scroll down for recommendations</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="bounce-arrow">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            )}

            <div className={`player-controls-bottom ${showControls ? 'visible' : 'hidden'}`}>
              <div className="progress-bar-container" ref={progressContainerRef} onClick={handleProgressClick}>
                <div className="progress-bar-bg" style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1E90FF' }}></div>
                  <div className="progress-bar-thumb" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `calc(${progress}% - 6px)`, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff', cursor: 'pointer' }}></div>
                </div>
              </div>
              <div className="controls-row">
                <div className="controls-left">
                  <button className="control-btn" onClick={(e) => { e.currentTarget.blur(); togglePlay(); }} title={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    )}
                  </button>

                  {/* Skip Backward 10s */}
                  <button className="control-btn" onClick={(e) => { e.currentTarget.blur(); skipTime(-10); }} title="Skip Backward 10s">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <text x="12" y="15.5" fontSize="8" fontWeight="bold" fill="currentColor" textAnchor="middle">10</text>
                    </svg>
                  </button>

                  {/* Skip Forward 10s */}
                  <button className="control-btn" onClick={(e) => { e.currentTarget.blur(); skipTime(10); }} title="Skip Forward 10s">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <text x="12" y="15.5" fontSize="8" fontWeight="bold" fill="currentColor" textAnchor="middle">10</text>
                    </svg>
                  </button>

                  {/* Volume Control Container */}
                  <div className="volume-container">
                    <button className="control-btn" onClick={(e) => { e.currentTarget.blur(); toggleMute(); }} title={isMuted ? 'Unmute' : 'Mute'}>
                      {isMuted ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                      ) : volume < 0.5 ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                      )}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05" 
                      value={isMuted ? 0 : volume} 
                      onChange={handleVolumeChange} 
                      onMouseUp={(e) => e.target.blur()}
                      onTouchEnd={(e) => e.target.blur()}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                          e.preventDefault();
                          skipTime(e.key === 'ArrowLeft' ? -10 : 10);
                        }
                      }}
                      className="volume-slider"
                    />
                  </div>

                  <span className="time-display">{currentTimeStr} / {durationStr}</span>
                </div>
                
                <div className="controls-right" style={{ position: 'relative' }}>
                  {/* Direct subtitle toggle/upload button */}
                  <button 
                    className={`control-btn ${subtitlesEnabled ? 'active' : ''}`} 
                    onClick={(e) => {
                      e.currentTarget.blur();
                      if (subtitleUrl) {
                        setSubtitlesEnabled(!subtitlesEnabled);
                      } else {
                        fileInputRef.current?.click();
                      }
                    }} 
                    title={subtitleUrl ? (subtitlesEnabled ? 'Disable Subtitles' : 'Enable Subtitles') : 'Upload Subtitles'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      <path d="M7 8h10M7 12h7" />
                    </svg>
                  </button>

                  {/* Picture in Picture */}
                  <button className="control-btn" onClick={(e) => { e.currentTarget.blur(); togglePiP(); }} title="Picture in Picture">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                      <rect x="13" y="13" width="7" height="7" />
                    </svg>
                  </button>

                  {/* Settings Gear Dropdown */}
                  <button className="control-btn" title="Settings" onClick={(e) => { e.currentTarget.blur(); setShowSettings(!showSettings); setActiveSettingsTab('main'); }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>

                  {/* Settings Menu Panel */}
                  {showSettings && (
                    <div className="settings-menu">
                      {activeSettingsTab === 'main' && (
                        <>
                          <div style={{ padding: '8px 16px', fontSize: '0.8rem', color: '#888', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>SETTINGS</div>
                          <button className="settings-item" onClick={() => setActiveSettingsTab('quality')}>
                            <span>Quality</span>
                            <span className="settings-item-value">{currentQualityIndex === -1 ? 'Auto' : qualities.find(q => q.index === currentQualityIndex)?.height + 'p'}</span>
                          </button>
                          <button className="settings-item" onClick={() => setActiveSettingsTab('speed')}>
                            <span>Playback Speed</span>
                            <span className="settings-item-value">{playbackSpeed === 1.0 ? 'Normal' : playbackSpeed + 'x'}</span>
                          </button>
                          <button className="settings-item" onClick={() => setActiveSettingsTab('subtitles')}>
                            <span>Subtitles</span>
                            <span className="settings-item-value">
                              {subtitleUrl ? (subtitlesEnabled ? 'On' : 'Off') : 'Not Loaded'}
                            </span>
                          </button>
                          <button className="settings-item" onClick={() => setActiveSettingsTab('subtitle-styles')}>
                            <span>Subtitle Styling</span>
                            <span className="settings-item-value">Configure</span>
                          </button>
                        </>
                      )}

                      {activeSettingsTab === 'quality' && (
                        <>
                          <div className="settings-header" onClick={() => setActiveSettingsTab('main')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                            <span>Back to Settings</span>
                          </div>
                          <button 
                            className={`settings-option ${currentQualityIndex === -1 ? 'active' : ''}`}
                            onClick={() => selectQuality(-1)}
                          >
                            <span>Auto</span>
                            {currentQualityIndex === -1 && <span className="settings-option-check">✓</span>}
                          </button>
                          {qualities.map(q => (
                            <button 
                              key={q.index}
                              className={`settings-option ${currentQualityIndex === q.index ? 'active' : ''}`}
                              onClick={() => selectQuality(q.index)}
                            >
                              <span>{q.height}p</span>
                              {currentQualityIndex === q.index && <span className="settings-option-check">✓</span>}
                            </button>
                          ))}
                        </>
                      )}

                      {activeSettingsTab === 'speed' && (
                        <>
                          <div className="settings-header" onClick={() => setActiveSettingsTab('main')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                            <span>Back to Settings</span>
                          </div>
                          {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(speed => (
                            <button 
                              key={speed}
                              className={`settings-option ${playbackSpeed === speed ? 'active' : ''}`}
                              onClick={() => {
                                setPlaybackSpeed(speed);
                                if (videoRef.current) videoRef.current.playbackRate = speed;
                                setShowSettings(false);
                              }}
                            >
                              <span>{speed === 1.0 ? '1.0x (Normal)' : speed + 'x'}</span>
                              {playbackSpeed === speed && <span className="settings-option-check">✓</span>}
                            </button>
                          ))}
                        </>
                      )}

                      {activeSettingsTab === 'subtitles' && (
                        <>
                          <div className="settings-header" onClick={() => setActiveSettingsTab('main')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                            <span>Back to Settings</span>
                          </div>
                          {subtitleUrl && (
                            <button 
                              className={`settings-option ${subtitlesEnabled ? 'active' : ''}`}
                              onClick={() => {
                                setSubtitlesEnabled(!subtitlesEnabled);
                                setShowSettings(false);
                              }}
                            >
                              <span>Enable Subtitles</span>
                              {subtitlesEnabled && <span className="settings-option-check">✓</span>}
                            </button>
                          )}
                          <button 
                            className="settings-option" 
                            onClick={() => {
                              fileInputRef.current?.click();
                              setShowSettings(false);
                            }}
                            style={{ color: '#1E90FF', fontWeight: 'bold' }}
                          >
                            <span>Upload Subtitle (.srt, .vtt)</span>
                            <span style={{ fontSize: '1.2rem' }}>+</span>
                          </button>
                        </>
                      )}

                      {activeSettingsTab === 'subtitle-styles' && (
                        <>
                          <div className="settings-header" onClick={() => setActiveSettingsTab('main')}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}><polyline points="15 18 9 12 15 6"></polyline></svg>
                            <span>Back to Settings</span>
                          </div>
                          <button className="settings-option" onClick={cycleSubtitleSize}>
                            <span>Font Size</span>
                            <span className="settings-item-value" style={{ textTransform: 'capitalize' }}>
                              {subtitleSize === '0.8rem' && 'Small'}
                              {subtitleSize === '1.1rem' && 'Normal'}
                              {subtitleSize === '1.4rem' && 'Large'}
                              {subtitleSize === '1.8rem' && 'Extra Large'}
                            </span>
                          </button>
                          <button className="settings-option" onClick={cycleSubtitleColor}>
                            <span>Text Color</span>
                            <span className="settings-item-value" style={{ textTransform: 'capitalize', color: subtitleColor }}>
                              {subtitleColor === '#ffffff' && 'White'}
                              {subtitleColor === '#ffff00' && 'Yellow'}
                              {subtitleColor === '#00ffff' && 'Cyan'}
                              {subtitleColor === '#00ff00' && 'Green'}
                            </span>
                          </button>
                          <button className="settings-option" onClick={cycleSubtitleBg}>
                            <span>Background</span>
                            <span className="settings-item-value">
                              {subtitleBg === 'rgba(0, 0, 0, 0.7)' && 'Dark'}
                              {subtitleBg === 'rgba(0, 0, 0, 1)' && 'Solid Black'}
                              {subtitleBg === 'rgba(0, 0, 0, 0)' && 'None'}
                            </span>
                          </button>
                          <div className="settings-option-stepper">
                            <span>Line Spacing</span>
                            <div className="stepper-controls">
                              <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); adjustLineHeight(-0.1); }} title="Decrease Gap">-</button>
                              <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); adjustLineHeight(0.1); }} title="Increase Gap">+</button>
                            </div>
                          </div>
                          <div className="settings-option-stepper">
                            <span>Vertical Position</span>
                            <div className="stepper-controls">
                              <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); adjustY(-10); }} title="Move Up">-</button>
                              <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); adjustY(10); }} title="Move Down">+</button>
                            </div>
                          </div>
                          <div className="settings-option-stepper">
                            <span>Horizontal Position</span>
                            <div className="stepper-controls">
                              <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); adjustX(-10); }} title="Move Left">-</button>
                              <button className="stepper-btn" onClick={(e) => { e.stopPropagation(); adjustX(10); }} title="Move Right">+</button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <button className="control-btn" onClick={(e) => { e.currentTarget.blur(); toggleFullscreen(); }} title="Fullscreen">
                    {isFullscreen ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content Layer (slides up over the video player) */}
      {!isFullscreen && !isLoading && !error && (
        <div className="scroll-content-layer">
          {/* A 100vh spacer so the video is fully visible on load */}
          <div className="viewport-spacer"></div>

          {/* The glassmorphic recommendation overlay */}
          <div className="details-recommendations-overlay">
            <div className="overlay-actions-bar">
              <button className="action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                Add to Watchlist
              </button>
            </div>

            {otherMovies.length > 0 && (
              <div className="other-movies-section">
                <h3 className="section-title">More Movies for You</h3>
                <div className="movies-grid-horizontal">
                  {otherMovies.map((m) => (
                    <div key={m.id} className="movie-mini-card" onClick={() => playMovie(m)}>
                      <div className="card-image-wrapper">
                        <img src={m.thumbnailUrl || 'https://images.unsplash.com/photo-1596727147705-61a532a659bd?q=80&w=300'} alt={m.title} className="card-thumbnail" />
                        <div className="play-overlay">
                          <svg viewBox="0 0 24 24" fill="currentColor" className="overlay-play-icon">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      </div>
                      <div className="card-info">
                        <h4 className="card-title">{m.title}</h4>
                        <div className="card-meta">
                          <span className="card-genre">{m.genre}</span>
                          <span className="card-year">{m.releaseYear}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for subtitles */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept=".srt,.vtt" 
        style={{ display: 'none' }} 
        onChange={handleSubtitleUpload} 
      />
    </div>
  );
};

export default Watch;
