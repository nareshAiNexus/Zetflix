import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroCarousel from '../components/HeroCarousel';
import MovieModal from '../components/MovieModal';
import MovieSkeleton from '../components/MovieSkeleton';
import useMovieStore from '../store/useMovieStore';
import { fetchUserProfile } from '../api/api';

const Home = () => {
  const navigate = useNavigate();
  const { movies, isLoading, fetchMovies, getRecentMovies, getMoviesByGenre } = useMovieStore();
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentlyWatched, setRecentlyWatched] = useState([]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  useEffect(() => {
    const loadWatchProgress = async () => {
      try {
        const profileData = await fetchUserProfile();
        if (profileData && profileData.recentlyWatched) {
          setRecentlyWatched(profileData.recentlyWatched);
        }
      } catch (err) {
        console.warn("Failed to load user watch progress for homepage:", err);
      }
    };
    loadWatchProgress();
  }, []);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  // Human-readable labels for genre enum values
  const GENRE_LABELS = {
    ACTION: 'Action', COMEDY: 'Comedy', DRAMA: 'Drama',
    HORROR: 'Horror', ROMANCE: 'Romance', THRILLER: 'Thriller',
    DOCUMENTARY: 'Documentary', ANIME: 'Anime', SCI_FI: 'Sci-Fi',
    UNCATEGORIZED: 'Uncategorized'
  };

  const recentMovies = getRecentMovies(5);
  const moviesByGenre = getMoviesByGenre();
  const genres = Object.keys(moviesByGenre).sort();

  // Helper to format duration
  const formatDuration = (mins) => {
    if (!mins) return '2h';
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  // Map backend movie object to fields expected by components
  const mapMovieToComponent = (m) => ({
    id: m.id,
    title: m.title,
    imageUrl: m.thumbnailUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80',
    year: m.releaseYear?.toString() || 'N/A',
    maturity: 'A',
    duration: formatDuration(m.durationMinutes),
    languages: 'English',
    genre: m.genre ? GENRE_LABELS[m.genre] || m.genre : 'Drama',
    tags: [m.genre ? GENRE_LABELS[m.genre] || m.genre : 'Drama'],
    description: m.description || '',
    hlsUrl: m.hlsUrl,
    videoStatus: m.videoStatus,
    rating: m.rating || 0.0
  });

  return (
    <div style={{ backgroundColor: '#141414', minHeight: '100vh', width: '100%' }}>
      {isLoading ? (
        <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderColor: '#e50914', borderTopColor: 'transparent', borderWidth: '4px' }} />
        </div>
      ) : recentMovies.length > 0 ? (
        <HeroCarousel movies={recentMovies.map(mapMovieToComponent)} />
      ) : (
        <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 4%' }}>
          <h2 style={{ color: 'white', marginBottom: '8px' }}>Welcome to Zetflix</h2>
          <p style={{ color: '#888' }}>No movies are ready to stream yet. Upload some movies to get started!</p>
        </div>
      )}

      {/* Movie Catalog Shelf Lists */}
      <div style={{ position: 'relative', zIndex: 5, marginTop: '-50px', paddingBottom: '40px' }}>
        {isLoading ? (
          <div className="content-section" style={{ padding: '0 4%', marginTop: '15px' }}>
            <h2 style={{ color: '#e5e5e5', fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Loading Catalog...</h2>
            <div className="movies-grid" style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px' }}>
              {[1, 2, 3, 4, 5, 6].map(n => <div key={n} style={{ minWidth: '180px' }}><MovieSkeleton /></div>)}
            </div>
          </div>
        ) : (
          <>
            {/* 1. Dedicated "Recently Watched" Row with play progress bar */}
            {!isLoading && recentlyWatched.length > 0 && (
              <div className="content-section" style={{ padding: '0 4%', marginTop: '16px', marginBottom: '24px' }}>
                <h2 style={{ 
                  color: '#e5e5e5', 
                  fontSize: '1.3rem', 
                  fontWeight: '700', 
                  marginBottom: '6px',
                  letterSpacing: '0.5px'
                }}>
                  Recently Watched
                </h2>
                <div className="movies-grid" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  overflowX: 'auto', 
                  paddingBottom: '10px',
                  scrollbarWidth: 'none' 
                }}>
                  {recentlyWatched.map(item => {
                    const percent = Math.min(100, Math.round((item.lastWatchedTimeSeconds / item.totalDurationSeconds) * 100));
                    return (
                      <div 
                        key={item.movieId} 
                        className="movie-card" 
                        style={{ 
                          minWidth: '280px', 
                          width: '280px',
                          cursor: 'pointer', 
                          transition: 'transform 0.2s ease'
                        }}
                        onClick={() => navigate(`/watch/${item.movieId}?t=${item.lastWatchedTimeSeconds}`)}
                      >
                        {/* Landscape 16:9 thumbnail */}
                        <div 
                          style={{ 
                            backgroundImage: `url(${item.thumbnailUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'})`, 
                            width: '100%',
                            height: '158px',
                            backgroundSize: 'cover', 
                            backgroundPosition: 'center top', 
                            borderRadius: '4px', 
                            position: 'relative',
                            border: '1px solid rgba(255, 255, 255, 0.08)'
                          }}
                        >
                          {/* Hover overlay */}
                          <div style={{ 
                            position: 'absolute', inset: 0,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            background: 'rgba(0,0,0,0.55)', 
                            opacity: 0, 
                            borderRadius: '4px',
                            transition: 'opacity 0.2s' 
                          }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                            <div style={{ 
                              background: 'rgba(255,255,255,0.95)', 
                              color: '#000', 
                              borderRadius: '50%', 
                              width: '44px', 
                              height: '44px', 
                              fontSize: '16px', 
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                            }}>
                              ▶
                            </div>
                          </div>

                          {/* Red progress bar at very bottom of card */}
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: 'rgba(255,255,255,0.15)', borderBottomLeftRadius: '4px', borderBottomRightRadius: '4px' }}>
                            <div style={{ height: '100%', backgroundColor: '#e50914', width: `${percent}%`, transition: 'width 0.3s ease' }} />
                          </div>
                        </div>

                        {/* Movie title below card */}
                        <p style={{ fontSize: '0.82rem', color: '#d4d4d4', marginTop: '5px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Existing Genre Catalog Rows (Unmodified & Clean) */}
            {genres.map(genreKey => {
              const genreMovies = moviesByGenre[genreKey];
              if (genreMovies.length === 0) return null;

              return (
                <div key={genreKey} className="content-section" style={{ padding: '0 4%', marginTop: '16px' }}>
                  <h2 style={{ 
                    color: '#e5e5e5', 
                    fontSize: '1.3rem', 
                    fontWeight: '700', 
                    marginBottom: '6px',
                    letterSpacing: '0.5px'
                  }}>
                    {GENRE_LABELS[genreKey] || genreKey}
                  </h2>
                  <div className="movies-grid" style={{ 
                    display: 'flex', 
                    gap: '6px', /* Tight 6px gap exactly like Netflix */
                    overflowX: 'auto', 
                    paddingBottom: '10px',
                    scrollbarWidth: 'none' /* Hide scrollbar for clean look */
                  }}>
                    {genreMovies.map(m => {
                      const compMovie = mapMovieToComponent(m);
                      const isReady = m.videoStatus === 'READY';
                      return (
                        <div 
                          key={m.id} 
                          className="movie-card" 
                          style={{ 
                            minWidth: '130px', 
                            width: '130px',
                            cursor: 'pointer', 
                            opacity: isReady ? 1 : 0.75,
                            transition: 'transform 0.3s ease'
                          }}
                          onClick={() => openModal(compMovie)}
                        >
                          <div 
                            className="movie-card-img" 
                            style={{ 
                              backgroundImage: `url(${compMovie.imageUrl})`, 
                              height: '185px', /* Shrink portrait ratio */
                              backgroundSize: 'cover', 
                              backgroundPosition: 'center', 
                              borderRadius: '4px', /* Sharp 4px borders */
                              position: 'relative',
                              border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}
                          >
                            {!isReady && (
                              <div style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: 'rgba(0,0,0,0.85)',
                                color: '#f59e0b',
                                padding: '2px 6px',
                                borderRadius: '2px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                border: '1px solid #f59e0b',
                                letterSpacing: '0.5px'
                              }}>
                                {m.videoStatus || 'PROCESSING'}
                              </div>
                            )}
                            <div className="movie-card-overlay" style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              height: '100%', 
                              background: 'rgba(0,0,0,0.5)', 
                              opacity: 0, 
                              borderRadius: '4px',
                              transition: 'opacity 0.2s' 
                            }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                              <button className="play-btn" style={{ 
                                background: '#fff', 
                                color: '#000', 
                                border: 'none', 
                                borderRadius: '50%', 
                                width: '45px', 
                                height: '45px', 
                                fontSize: '18px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                              }}>
                                {isReady ? '▶' : '⚙️'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <MovieModal 
        movie={selectedMovie} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default Home;
