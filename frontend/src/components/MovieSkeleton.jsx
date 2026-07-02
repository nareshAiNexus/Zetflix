import React from 'react';
import './MovieSkeleton.css';

const MovieSkeleton = () => {
  return (
    <div className="movie-skeleton">
      <div className="skeleton-img pulse"></div>
      <div className="skeleton-text title pulse"></div>
      <div className="skeleton-text subtitle pulse"></div>
    </div>
  );
};

export default MovieSkeleton;
