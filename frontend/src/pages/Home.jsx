import React, { useState, useEffect } from 'react';
import HeroCarousel from '../components/HeroCarousel';
import MovieModal from '../components/MovieModal';
import MovieSkeleton from '../components/MovieSkeleton';

const Home = () => {
  const [uploadedMovies, setUploadedMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uploads = JSON.parse(localStorage.getItem('uploadedMovies') || '[]');
    setUploadedMovies(uploads);
    
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setIsModalOpen(true);
  };

  // Mock movie data for the sections
  const mockMovies = [
    { 
      id: 101, title: 'Pulp Fiction', imageUrl: '/images/pulp-fiction.jpg',
      year: '1994', maturity: 'R', duration: '2h 34m', tags: ['Crime', 'Drama'],
      buttonColor: 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)',
      description: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.'
    },
    { 
      id: 102, title: 'Kill Bill', imageUrl: '/images/killbill.jpg',
      year: '2003', maturity: 'R', duration: '1h 51m', tags: ['Action', 'Crime', 'Thriller'],
      buttonColor: 'linear-gradient(90deg, #fbc02d 0%, #ff8f00 100%)',
      description: 'After awakening from a four-year coma, a former assassin wreaks vengeance on the team of assassins who betrayed her.'
    },
    { 
      id: 103, title: 'Reservoir Dogs', imageUrl: '/images/reservoir-dogs.jpg',
      year: '1992', maturity: 'R', duration: '1h 39m', tags: ['Crime', 'Thriller'],
      buttonColor: 'linear-gradient(90deg, #424242 0%, #212121 100%)',
      description: 'When a simple jewelry heist goes horribly wrong, the surviving criminals begin to suspect that one of them is a police informant.'
    },
    { 
      id: 104, title: 'Inglourious Basterds', imageUrl: '/images/inglourious-basterds.jpg',
      year: '2009', maturity: 'R', duration: '2h 33m', tags: ['Adventure', 'Drama', 'War'],
      buttonColor: 'linear-gradient(90deg, #8e0000 0%, #b71c1c 100%)',
      description: 'In Nazi-occupied France during World War II, a plan to assassinate Nazi leaders by a group of Jewish U.S. soldiers coincides with a theatre owner\'s vengeful plans.'
    },
    { 
      id: 105, title: 'Once Upon a Time in Hollywood', imageUrl: '/images/ouoh.jpg',
      year: '2019', maturity: 'R', duration: '2h 41m', tags: ['Comedy', 'Drama'],
      buttonColor: 'linear-gradient(90deg, #e65100 0%, #ff9800 100%)',
      description: 'A faded television actor and his stunt double strive to achieve fame and success in the final years of Hollywood\'s Golden Age in 1969 Los Angeles.'
    }
  ];

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

      <div className="content-section" style={{ padding: '0 5%', marginTop: '30px' }}>
        <h2 style={{ color: 'white', marginBottom: '15px' }}>Continue Watching</h2>
        <div className="movies-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
          {isLoading ? (
            [1, 2, 3].map(n => <div key={n} style={{ minWidth: '300px' }}><MovieSkeleton /></div>)
          ) : (
            mockMovies.slice(0, 3).map(movie => (
              <div 
              key={movie.id} 
              className="movie-card" 
              style={{ minWidth: '300px', cursor: 'pointer' }}
              onClick={() => openModal({ ...movie, isContinue: true })}
            >
              <div 
                className="movie-card-img" 
                style={{ 
                  backgroundImage: `url(${movie.imageUrl})`, 
                  height: '170px', 
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
            ))
          )}
        </div>
      </div>

      <div className="content-section" style={{ padding: '0 5%', marginTop: '30px', paddingBottom: '50px' }}>
        <h2 style={{ color: 'white', marginBottom: '15px' }}>New Arrivals</h2>
        <div className="movies-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '10px' }}>
          {isLoading ? (
            [1, 2, 3, 4, 5].map(n => <div key={n} style={{ minWidth: '200px' }}><MovieSkeleton /></div>)
          ) : (
            mockMovies.map(movie => (
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
            ))
          )}
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
