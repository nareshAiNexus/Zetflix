import React, { useState, useEffect } from 'react';
import './HeroCarousel.css';
import MovieModal from './MovieModal';

const HeroCarousel = ({ movies = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (movies.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % movies.length);
    }, 5000); // Slide every 5 seconds

    return () => clearInterval(timer);
  }, [movies.length]);

  if (movies.length === 0) return null;

  // Safe indexing
  const currentMovie = movies[currentIndex] || movies[0];

  return (
    <div className="hero-carousel-container">
      {movies.map((movie, index) => {
        const isActive = index === currentIndex;
        return (
          <div
            key={movie.id}
            className={`carousel-slide ${isActive ? 'active' : ''}`}
          >
            <div 
              className="carousel-image"
              style={{ backgroundImage: `url(${movie.imageUrl})` }}
            >
              <div className="carousel-gradient-overlay" />
            </div>
            
            <div className="carousel-content-wrapper">
              <div className="carousel-content">
                <h1 className="movie-title">{movie.title}</h1>
                <p className="movie-meta">
                  {movie.year} • {movie.genre}
                </p>
                <div className="action-buttons">
                  <button className="btn-play" onClick={() => openModal(movie)} title="Watch Now">
                    <span className="icon">▶</span> Watch Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {movies.length > 1 && (
        <div className="carousel-indicators">
          {movies.map((_, index) => (
            <div
              key={index}
              className={`indicator ${index === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}

      <MovieModal 
        isOpen={isModalOpen} 
        movie={selectedMovie} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default HeroCarousel;
