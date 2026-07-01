import React, { useState, useEffect } from 'react';
import './HeroCarousel.css';
import MovieModal from './MovieModal';

const mockMovies = [
  {
    id: 1,
    title: "KILL BILL",
    year: 2003,
    languages: "English",
    genre: "Action • Thriller",
    imageUrl: "/images/killbill.jpg",
    topBadge: "Volume 1",
    maturity: "A",
    duration: "1h 51m",
    description: "After awakening from a four-year coma, a former assassin wreaks vengeance on the team of assassins who betrayed her.",
    tags: ["Action", "Martial Arts", "Revenge", "Iconic"],
    buttonColor: "#F4D03F"
  },
  {
    id: 2,
    title: "INGLOURIOUS BASTERDS",
    year: 2009,
    languages: "English • French • German",
    genre: "War • Action",
    imageUrl: "/images/inglourious-basterds.jpg",
    topBadge: "Tarantino Masterpiece",
    maturity: "A",
    duration: "2h 33m",
    description: "In Nazi-occupied France during World War II, a plan to assassinate Nazi leaders by a group of Jewish U.S. soldiers coincides with a theatre owner's vengeful plans for the same.",
    tags: ["War", "Action", "History", "Revenge"],
    buttonColor: "#B03A2E"
  },
  {
    id: 3,
    title: "RESERVOIR DOGS",
    year: 1992,
    languages: "English",
    genre: "Crime • Thriller",
    imageUrl: "/images/reservoir-dogs.jpg",
    topBadge: "Cult Classic",
    maturity: "A",
    duration: "1h 39m",
    description: "When a simple jewelry heist goes horribly wrong, the surviving criminals begin to suspect that one of them is a police informant.",
    tags: ["Crime", "Thriller", "Heist", "Classic"],
    buttonColor: "#922B21"
  },
  {
    id: 4,
    title: "PULP FICTION",
    year: 1994,
    languages: "English",
    genre: "Crime • Drama",
    imageUrl: "/images/pulp-fiction.jpg",
    maturity: "A",
    duration: "2h 34m",
    description: "The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.",
    tags: ["Crime", "Drama", "Cult", "Masterpiece"],
    buttonColor: "#E67E22"
  },
  {
    id: 5,
    title: "ONCE UPON A TIME IN HOLLYWOOD",
    year: 2019,
    languages: "English",
    genre: "Comedy • Drama",
    imageUrl: "/images/ouoh.jpg",
    topBadge: "Academy Award Winner",
    maturity: "A",
    duration: "2h 41m",
    description: "A faded television actor and his stunt double strive to achieve fame and success in the final years of Hollywood's Golden Age in 1969 Los Angeles.",
    tags: ["Comedy", "Drama", "Hollywood", "Nostalgia"],
    buttonColor: "#F39C12"
  }
];

const HeroCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % mockMovies.length);
    }, 4000); // Slide every 4 seconds

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-carousel-container">
      {mockMovies.map((movie, index) => {
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
              {movie.topBadge && <div className="top-badge">🏅 {movie.topBadge}</div>}
              
              <div className="carousel-content">
                <h1 className="movie-title">{movie.title}</h1>
                <p className="movie-meta">
                  {movie.year} • {movie.languages} • {movie.genre}
                </p>
                <div className="action-buttons">
                  <button className="btn-play" onClick={() => openModal(movie)}>
                    <span className="icon">▶</span>
                  </button>
                  <button className="btn-add">
                    <span className="icon">+</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="carousel-indicators">
        {mockMovies.map((_, index) => (
          <div
            key={index}
            className={`indicator ${index === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>

      <MovieModal 
        isOpen={isModalOpen} 
        movie={selectedMovie} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default HeroCarousel;
