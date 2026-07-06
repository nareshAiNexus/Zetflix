import React, { useRef, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Hls from 'hls.js';
import { getStreamingInfo } from '../api/api';
import './Watch.css';

const Watch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const movie = location.state?.movie || { title: 'Unknown Movie', id: '' };
  
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const progressContainerRef = useRef(null);
  const hlsRef = useRef(null);

  // ─── Playback States ──────────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTimeStr, setCurrentTimeStr] = useState('0:00');
  const [durationStr, setDurationStr] = useState('0:00');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ─── API & HLS States ─────────────────────────────────────────
  const [streamingUrl, setStreamingUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [qualities, setQualities] = useState([]); // [{ index: number, height: number }]
  const [currentQualityIndex, setCurrentQualityIndex] = useState(-1); // -1 = Auto
  const [showSettings, setShowSettings] = useState(false);

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
          // If request is for a playlist path from the S3 bucket, sign it through streaming service
          if (url.includes('.m3u8') && !url.includes('X-Amz')) {
            const bucketUrlPart = '.amazonaws.com/';
            let path = url;
            if (url.includes(bucketUrlPart)) {
              path = url.split(bucketUrlPart)[1];
            }
            const encodedPath = encodeURIComponent(path);
            xhr.open('GET', `http://localhost:8084/api/v1/stream/${movie.id}/playlist?path=${encodedPath}`);
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
      if (isPlaying) {
        video.play().catch(e => console.log('Autoplay blocked:', e));
      }
    } else {
      setError('HLS streaming is not supported by your browser.');
    }
  }, [streamingUrl, movie.id]);

  // ─── Playback Controls ────────────────────────────────────────

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
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
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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

  const selectQuality = (index) => {
    setCurrentQualityIndex(index);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
    setShowSettings(false);
  };

  return (
    <div className="watch-page">
      {/* Blurred background */}
      <div 
        className="watch-background" 
        style={{ backgroundImage: `url(${movie.imageUrl || 'https://images.unsplash.com/photo-1596727147705-61a532a659bd?q=80&w=2000'})` }}
      />

      {/* Top Header */}
      <header className="watch-header">
        <button className="back-btn" onClick={() => navigate(-1)} title="Go Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h2 className="now-watching">Now Watching: {movie.title}</h2>
      </header>

      {/* Player Container */}
      <div className="player-wrapper">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="spinner" style={{ width: '50px', height: '50px', borderThickness: '4px' }} />
            <p>Fetching secure video stream...</p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
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
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: isFullscreen ? '0' : '8px 8px 0 0', cursor: 'pointer' }}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            
            {!isPlaying && (
              <div className="center-play-btn" onClick={togglePlay}>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              </div>
            )}

            <div className="player-controls-bottom" style={{ borderRadius: isFullscreen ? '0' : '0' }}>
              <div className="progress-bar-container" ref={progressContainerRef} onClick={handleProgressClick}>
                <div className="progress-bar-bg" style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'rgba(255,255,255,0.3)' }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, height: '100%', backgroundColor: '#1E90FF' }}></div>
                  <div className="progress-bar-thumb" style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: `calc(${progress}% - 6px)`, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fff', cursor: 'pointer' }}></div>
                </div>
              </div>
              <div className="controls-row">
                <div className="controls-left">
                  <button className="control-btn" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                    {isPlaying ? (
                      <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    )}
                  </button>
                  <button className="control-btn" onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    )}
                  </button>
                  <span className="time-display">{currentTimeStr} / {durationStr}</span>
                </div>
                
                <div className="controls-right" style={{ position: 'relative' }}>
                  <button className="control-btn" title="Quality Settings" onClick={() => setShowSettings(!showSettings)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                  </button>

                  {/* Quality Selector Dropdown flyout */}
                  {showSettings && (
                    <div className="quality-dropdown" style={{
                      position: 'absolute',
                      bottom: '40px',
                      right: '0',
                      background: 'rgba(20,20,20,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      padding: '10px 0',
                      width: '160px',
                      zIndex: 20,
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }}>
                      <div style={{ padding: '4px 16px 8px', fontSize: '0.8rem', color: '#666', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 'bold' }}>QUALITY</div>
                      <button 
                        onClick={() => selectQuality(-1)} 
                        style={{
                          width: '100%',
                          padding: '10px 16px',
                          textAlign: 'left',
                          background: currentQualityIndex === -1 ? 'rgba(30, 144, 255, 0.2)' : 'none',
                          border: 'none',
                          color: currentQualityIndex === -1 ? '#1E90FF' : 'white',
                          cursor: 'pointer',
                          fontWeight: '600'
                        }}
                      >
                        Auto
                      </button>
                      {qualities.map(q => (
                        <button 
                          key={q.index}
                          onClick={() => selectQuality(q.index)}
                          style={{
                            width: '100%',
                            padding: '10px 16px',
                            textAlign: 'left',
                            background: currentQualityIndex === q.index ? 'rgba(30, 144, 255, 0.2)' : 'none',
                            border: 'none',
                            color: currentQualityIndex === q.index ? '#1E90FF' : 'white',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {q.height}p
                        </button>
                      ))}
                    </div>
                  )}

                  <button className="control-btn" onClick={toggleFullscreen} title="Fullscreen">
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

        {/* Action Bar below player (hidden in fullscreen) */}
        {!isFullscreen && !isLoading && !error && (
          <div className="player-actions-bar">
            <button className="action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              Add to Watchlist
            </button>
            <button className="action-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watch;
