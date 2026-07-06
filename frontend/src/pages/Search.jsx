import React, { useState, useEffect, useCallback } from 'react';
import MovieModal from '../components/MovieModal';
import { searchMovies as apiSearchMovies } from '../api/api';
import useMovieStore from '../store/useMovieStore';
import './Pages.css';

// Human-readable labels for genre enum values
const GENRE_LABELS = {
  ACTION: 'Action', COMEDY: 'Comedy', DRAMA: 'Drama',
  HORROR: 'Horror', ROMANCE: 'Romance', THRILLER: 'Thriller',
  DOCUMENTARY: 'Documentary', ANIME: 'Anime', SCI_FI: 'Sci-Fi'
};

// Helper to format duration
const formatDuration = (mins) => {
  if (!mins) return '2h';
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  return hrs > 0 ? `${hrs}h ${m}m` : `${m}m`;
};

// Map backend movie object to component-expected shape
const mapMovie = (m) => ({
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

const Search = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load all movies once for fallback local filtering when API is down
  const { movies, fetchMovies } = useMovieStore();

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Debounced search — calls backend search API
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await apiSearchMovies(query);
        setResults(data.map(mapMovie));
      } catch (err) {
        // Fallback: filter from already loaded movies
        console.warn('Search API failed, falling back to local filter:', err);
        const filtered = movies
          .filter(m => m.title.toLowerCase().includes(query.toLowerCase()))
          .map(mapMovie);
        setResults(filtered);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, movies]);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  return (
    <div className="page-container search-page">
      <h2>Search</h2>
      <div className="search-bar-container">
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Search for movies..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      
      {isSearching && (
        <div style={{ textAlign: 'center', marginTop: '30px', color: '#888' }}>
          Searching...
        </div>
      )}

      {query && !isSearching && results.length === 0 && (
        <div className="search-results-placeholder">
          <p>No results found for "{query}"</p>
        </div>
      )}

      {query && results.length > 0 && (
        <div className="content-section" style={{ marginTop: '30px' }}>
          <div className="movies-grid" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {results.map(movie => {
              const isReady = movie.videoStatus === 'READY';
              return (
                <div 
                  key={movie.id} 
                  className="movie-card" 
                  style={{ width: '200px', cursor: 'pointer', marginBottom: '20px', opacity: isReady ? 1 : 0.7 }}
                  onClick={() => openModal(movie)}
                >
                  <div 
                    className="movie-card-img" 
                    style={{ 
                      backgroundImage: `url(${movie.imageUrl})`, 
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
                        {movie.videoStatus || 'PROCESSING'}
                      </div>
                    )}
                    <div className="movie-card-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <button className="play-btn" style={{ background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>▶</button>
                    </div>
                  </div>
                  <h4 style={{ color: 'white', marginTop: '10px', fontSize: '1rem' }}>{movie.title}</h4>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <MovieModal 
        movie={selectedMovie} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default Search;
