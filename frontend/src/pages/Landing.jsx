import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

const Landing = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      localStorage.setItem('userEmail', email);
      if (!isLogin && name) {
        localStorage.setItem('userName', name);
      }
      navigate('/');
    }
  };

  return (
    <div className="landing-page">
      <div className="landing-background">
        <div className="landing-bg-overlay"></div>
      </div>
      
      <header className="landing-header">
        <div className="landing-logo">
          <span style={{ color: '#E50914' }}>Z</span>
          <span style={{ color: '#32CD32' }}>E</span>
          <span style={{ color: '#FF4500' }}>T</span>
          <span style={{ color: '#00CED1' }}>F</span>
          <span style={{ color: '#FFA500' }}>🎬</span>
          <span style={{ color: '#1E90FF' }}>I</span>
          <span style={{ color: '#9400D3' }}>X</span>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="auth-input-group">
                <input 
                  type="text" 
                  placeholder="Full Name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="auth-input-group">
              <input 
                type="email" 
                placeholder="Email address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-input-group password-group">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
            <button type="submit" className="auth-submit-btn">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
            <div className="auth-help">
              <div className="auth-remember">
                <input type="checkbox" id="rememberMe" />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <a href="#" className="auth-help-link">Need help?</a>
            </div>
          </form>
          
          <div className="auth-toggle">
            {isLogin ? (
              <p>New to Zetflix? <span onClick={() => setIsLogin(false)}>Sign up now.</span></p>
            ) : (
              <p>Already have an account? <span onClick={() => setIsLogin(true)}>Sign in now.</span></p>
            )}
          </div>
          <div className="auth-captcha">
            <p>This page is protected by Google reCAPTCHA to ensure you're not a bot. <a href="#">Learn more.</a></p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Landing;
