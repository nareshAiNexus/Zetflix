import React, { useState, useEffect } from 'react';
import HeroCarousel from '../components/HeroCarousel';
import MovieModal from '../components/MovieModal';
import MovieSkeleton from '../components/MovieSkeleton';
import useMovieStore from '../store/useMovieStore';

const Home = () => {
  const { movies, isLoading, fetchMovies, getRecentMovies, getMoviesByGenre } = useMovieStore();
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
    maturity: 'A', // Default rating maturity
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
    <div>
      {isLoading ? (
        <div style={{ height: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', borderThickness: '4px' }} />
        </div>
      ) : recentMovies.length > 0 ? (
        <HeroCarousel movies={recentMovies.map(mapMovieToComponent)} />
      ) : (
        <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 5%' }}>
          <h2 style={{ color: 'white', marginBottom: '10px' }}>Welcome to Zetflix</h2>
          <p style={{ color: '#888' }}>No movies are ready to stream yet. Upload some movies to get started!</p>
        </div>
      )}

      {isLoading ? (
        <div className="content-section" style={{ padding: '0 5%', marginTop: '30px' }}>
          <h2 style={{ color: 'white', marginBottom: '15px' }}>Loading Catalog...</h2>
          <div className="movies-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
            {[1, 2, 3, 4, 5].map(n => <div key={n} style={{ minWidth: '200px' }}><MovieSkeleton /></div>)}
          </div>
        </div>
      ) : (
        genres.map(genreKey => {
          const genreMovies = moviesByGenre[genreKey];
          if (genreMovies.length === 0) return null;

          return (
            <div key={genreKey} className="content-section" style={{ padding: '0 5%', marginTop: '30px' }}>
              <h2 style={{ color: 'white', marginBottom: '15px', borderLeft: '4px solid #1E90FF', paddingLeft: '10px' }}>
                {GENRE_LABELS[genreKey] || genreKey}
              </h2>
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

export default Home;
