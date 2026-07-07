import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo-container">
        <div className="logo">
          <svg className="logo-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 12L4 24V0L24 12Z" fill="#e50914" />
          </svg>
          <span className="logo-text">ZETFLIX</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
