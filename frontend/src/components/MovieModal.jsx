import React from 'react';
import { useNavigate } from 'react-router-dom';
import './MovieModal.css';

const MovieModal = ({ movie, isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen || !movie) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="modal-hero">
          <div 
            className="modal-image-bg" 
            style={{ backgroundImage: `url(${movie.imageUrl})` }}
          />
          <div className="modal-gradient-bottom" />
          <div className="modal-gradient-side" />
          <button className="modal-mute-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          </button>
        </div>

        <div className="modal-info-section">
          <div className="modal-title-logo">
             {/* We can use text styling since we don't have the logo image */}
             <h2>{movie.title}</h2>
          </div>
          <p className="newly-added">Newly Added</p>

          <div className="modal-meta">
            <span>{movie.year}</span>
            <span className="dot">•</span>
            <span className="maturity">{movie.maturity || 'A'}</span>
            <span className="dot">•</span>
            <span>{movie.duration || '2h 15m'}</span>
            <span className="dot">•</span>
            <span>{movie.languages}</span>
          </div>

          <p className="modal-description">
            {movie.description || "A thrilling masterpiece that will keep you on the edge of your seat from start to finish. Explore the captivating journey of characters pushed to their limits in this iconic film."}
          </p>

          <div className="modal-tags">
            {(movie.tags || movie.genre.split(' • ')).map((tag, index, arr) => (
              <React.Fragment key={index}>
                <span className="tag">{tag}</span>
                {index < arr.length - 1 && <span className="pipe">|</span>}
              </React.Fragment>
            ))}
          </div>

          <div className="modal-actions" style={{ justifyContent: 'flex-end', width: '100%' }}>
            <button 
              className="btn-watch-now" 
              style={{ background: movie.buttonColor || 'linear-gradient(90deg, #1E90FF 0%, #D12CB2 100%)' }}
              onClick={() => navigate(`/watch/${movie.id}`, { state: { movie } })}
            >
              <span className="icon">▶</span> {movie.isContinue ? 'Continue' : 'Watch Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieModal;
