import React, { useState } from 'react';
import './Pages.css';

const Search = () => {
  const [query, setQuery] = useState('');

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
          placeholder="Search for movies, TV shows, and more..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      
      {query && (
        <div className="search-results-placeholder">
          <p>No results found for "{query}"</p>
        </div>
      )}
    </div>
  );
};

export default Search;
