import React, { useState, useEffect } from 'react';
import MovieModal from '../components/MovieModal';
import MovieSkeleton from '../components/MovieSkeleton';
import useMovieStore from '../store/useMovieStore';
import './Pages.css';

const Genres = () => {
  const { isLoading, fetchMovies, getMoviesByGenre } = useMovieStore();
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

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

  const moviesByGenre = getMoviesByGenre();
  const sortedGenres = Object.keys(moviesByGenre).sort();

  // Helper to format duration
  const formatDuration = (mins) => {
    if (!mins) return '2h';
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
  };

  // Map backend movie object to fields expected by component
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
    <div className="page-container">
      <h2>Genres</h2>
      <p style={{ color: '#a3a3a3', marginBottom: '30px' }}>Browse by your favorite categories.</p>
      
      {isLoading ? (
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {[1, 2, 3, 4].map(n => <div key={n} style={{ width: '200px', marginBottom: '20px' }}><MovieSkeleton /></div>)}
        </div>
      ) : sortedGenres.length === 0 ? (
        <p style={{ color: '#666', marginTop: '20px' }}>No movies found in database. Go to Upload in sidebar to add movies.</p>
      ) : (
        sortedGenres.map(genreKey => {
          const genreMovies = moviesByGenre[genreKey];
          if (genreMovies.length === 0) return null;

          return (
            <div key={genreKey} className="content-section" style={{ marginBottom: '40px' }}>
              <h3 style={{ color: 'white', marginBottom: '15px', borderLeft: '4px solid #1E90FF', paddingLeft: '10px' }}>
                {GENRE_LABELS[genreKey] || genreKey}
              </h3>
              <div className="movies-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
                {genreMovies.map(m => {
                  const compMovie = mapMovieToComponent(m);
                  const isReady = m.videoStatus === 'READY';
                  return (
                    <div 
                      key={m.id} 
                      className="movie-card" 
                      style={{ minWidth: '200px', cursor: 'pointer', opacity: isReady ? 1 : 0.7 }}
                      onClick={() => openModal(compMovie)}
                    >
                      <div 
                        className="movie-card-img" 
                        style={{ 
                          backgroundImage: `url(${compMovie.imageUrl})`, 
                          height: '300px', 
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center', 
                          borderRadius: '8px',
                          position: 'relative'
                        }}
                      >
                        {!isReady && (
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.8)',
                            color: '#f59e0b',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            border: '1px solid #f59e0b'
                          }}>
                            {m.videoStatus || 'PROCESSING'}
                          </div>
                        )}
                        <div className="movie-card-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                          <button className="play-btn" style={{ background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>
                            {isReady ? '▶' : '⚙️'}
                          </button>
                        </div>
                      </div>
                      <h4 style={{ color: 'white', marginTop: '10px', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {compMovie.title}
                      </h4>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      <MovieModal 
        movie={selectedMovie} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default Genres;
