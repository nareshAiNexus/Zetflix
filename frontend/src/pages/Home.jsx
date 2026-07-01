import React, { useState, useEffect } from 'react';
import HeroCarousel from '../components/HeroCarousel';
import MovieModal from '../components/MovieModal';

const Home = () => {
  const [uploadedMovies, setUploadedMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const uploads = JSON.parse(localStorage.getItem('uploadedMovies') || '[]');
    setUploadedMovies(uploads);
  }, []);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  return (
    <div>
      <HeroCarousel />
      
      {uploadedMovies.length > 0 && (
        <div className="content-section" style={{ padding: '0 5%', marginTop: '30px' }}>
          <h2 style={{ color: 'white', marginBottom: '15px' }}>Recently Uploaded</h2>
          <div className="movies-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
            {uploadedMovies.map(movie => (
              <div 
                key={movie.id} 
                className="movie-card" 
                style={{ minWidth: '200px', cursor: 'pointer' }}
                onClick={() => openModal(movie)}
              >
                <div 
                  className="movie-card-img" 
                  style={{ 
                    backgroundImage: `url(${movie.imageUrl})`, 
                    height: '300px', 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center', 
                    borderRadius: '8px' 
                  }}
                >
                  <div className="movie-card-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                    <button className="play-btn" style={{ background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px', cursor: 'pointer' }}>▶</button>
                  </div>
                </div>
                <h4 style={{ color: 'white', marginTop: '10px', fontSize: '1rem' }}>{movie.title}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder for other content */}
      <div className="content-section" style={{ padding: '0 5%', marginTop: '30px', paddingBottom: '50px' }}>
        <h2 style={{ color: 'white', marginBottom: '15px' }}>Continue Watching</h2>
        <div className="placeholder-movies" style={{ display: 'flex', gap: '15px' }}>
          <div className="placeholder-card" style={{ width: '300px', height: '170px', background: '#222', borderRadius: '8px' }}></div>
          <div className="placeholder-card" style={{ width: '300px', height: '170px', background: '#222', borderRadius: '8px' }}></div>
          <div className="placeholder-card" style={{ width: '300px', height: '170px', background: '#222', borderRadius: '8px' }}></div>
        </div>
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
