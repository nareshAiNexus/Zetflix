import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { loginUser, signupUser, verifyEmail, forgotPassword, resetPassword, resendOtp } from '../api/api';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import './Landing.css';

const Landing = () => {
  // Navigation & Store
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Toast notifications
  const { toasts, showToast, dismissToast } = useToast();

  // Core Authentication states
  const [authMode, setAuthMode] = useState('LOGIN'); // LOGIN, SIGNUP, OTP_VERIFY, FORGOT_PASSWORD, RESET_PASSWORD
  const [loading, setLoading] = useState(false);

  // Inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Handle Form Submissions
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'LOGIN') {
        const response = await loginUser(email, password);
        login(response.token, response.email, response.name, response.role);
        showToast('Sign in successful! Redirecting…', 'success', 2000);
        setTimeout(() => navigate('/'), 1500);
      } 
      else if (authMode === 'SIGNUP') {
        if (!name || !email || !password || !dob) {
          showToast('All fields are required', 'warning');
          setLoading(false);
          return;
        }
        await signupUser(name, email, password, dob);
        showToast('Account created! A verification OTP has been sent to your email.', 'success', 6000);
        setAuthMode('OTP_VERIFY');
      } 
      else if (authMode === 'OTP_VERIFY') {
        if (!otp) { showToast('Please enter the 6-digit OTP code', 'warning'); setLoading(false); return; }
        await verifyEmail(email, otp);
        showToast('Email verified! You can now sign in.', 'success', 5000);
        setAuthMode('LOGIN');
        setPassword('');
      } 
      else if (authMode === 'FORGOT_PASSWORD') {
        if (!email) { showToast('Please enter your email address', 'warning'); setLoading(false); return; }
        await forgotPassword(email);
        showToast('A password reset code has been sent to your email.', 'info', 6000);
        setAuthMode('RESET_PASSWORD');
      } 
      else if (authMode === 'RESET_PASSWORD') {
        if (!resetToken || !password) { showToast('Please enter the reset code and new password', 'warning'); setLoading(false); return; }
        await resetPassword(resetToken, password);
        showToast('Password reset successfully! Please sign in with your new password.', 'success', 5000);
        setAuthMode('LOGIN');
        setPassword('');
        setResetToken('');
      }
    } catch (err) {
      showToast(err.message || 'An unexpected error occurred. Please try again.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      showToast('Email is missing. Please start over.', 'warning');
      setAuthMode('SIGNUP');
      return;
    }
    setLoading(true);
    try {
      await resendOtp(email);
      showToast('A new verification OTP has been sent to your email.', 'success', 6000);
    } catch (err) {
      showToast(err.message || 'Failed to resend OTP. Please try again.', 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    switch (authMode) {
      case 'LOGIN': return 'Sign In';
      case 'SIGNUP': return 'Sign Up';
      case 'OTP_VERIFY': return 'Verify Account';
      case 'FORGOT_PASSWORD': return 'Forgot Password';
      case 'RESET_PASSWORD': return 'Reset Password';
      default: return 'Sign In';
    }
  };

  return (
    <div className="landing-page">
      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      <div className="landing-background">
        <div className="landing-bg-overlay"></div>
      </div>
      
      <header className="landing-header">
        <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'transparent', boxShadow: 'none', padding: 0 }}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '32px', height: '32px' }}>
            <path d="M24 12L4 24V0L24 12Z" fill="#e50914" />
          </svg>
          <span style={{ color: '#e50914', fontSize: '2.2rem', fontWeight: '900', letterSpacing: '1px' }}>ZETFLIX</span>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <h2>{getFormTitle()}</h2>

          <form className="auth-form" onSubmit={handleSubmit}>
            {authMode === 'SIGNUP' && (
              <>
                <div className="auth-input-group">
                  <input 
                    type="text" 
                    placeholder="Full Name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="auth-input-group" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '0.8rem', color: '#b3b3b3', paddingLeft: '5px' }}>Date of Birth</label>
                  <input 
                    type="date" 
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    required
                    style={{ padding: '10px 20px' }}
                  />
                </div>
              </>
            )}

            {(authMode === 'LOGIN' || authMode === 'SIGNUP' || authMode === 'FORGOT_PASSWORD') && (
              <div className="auth-input-group">
                <input 
                  type="email" 
                  placeholder="Email address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {authMode === 'OTP_VERIFY' && (
              <div className="auth-input-group">
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP code" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
            )}

            {authMode === 'RESET_PASSWORD' && (
              <div className="auth-input-group">
                <input 
                  type="text" 
                  placeholder="Enter reset code" 
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
            )}

            {(authMode === 'LOGIN' || authMode === 'SIGNUP' || authMode === 'RESET_PASSWORD') && (
              <div className="auth-input-group password-group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder={authMode === 'RESET_PASSWORD' ? "New Password" : "Password"} 
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
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Processing...' : getFormTitle()}
            </button>

            {authMode === 'LOGIN' && (
              <div className="auth-help">
                <div className="auth-remember">
                  <input type="checkbox" id="rememberMe" />
                  <label htmlFor="rememberMe">Remember me</label>
                </div>
                <span 
                  onClick={() => setAuthMode('FORGOT_PASSWORD')} 
                  className="auth-help-link" 
                  style={{ cursor: 'pointer' }}
                >
                  Forgot password?
                </span>
              </div>
            )}
          </form>

          {/* Toggle Screens */}
          <div className="auth-toggle">
            {authMode === 'LOGIN' && (
              <p>New to Zetflix? <span onClick={() => { setAuthMode('SIGNUP'); }}>Sign up now.</span></p>
            )}
            {authMode === 'SIGNUP' && (
              <p>Already have an account? <span onClick={() => { setAuthMode('LOGIN'); }}>Sign in now.</span></p>
            )}
            {authMode === 'OTP_VERIFY' && (
              <>
                <p>Didn't receive the email? <span onClick={handleResendOtp}>Resend OTP.</span></p>
                <p>Wrong email? <span onClick={() => { setAuthMode('SIGNUP'); }}>Change details.</span> or <span onClick={() => setAuthMode('LOGIN')}>Sign in.</span></p>
              </>
            )}
            {(authMode === 'FORGOT_PASSWORD' || authMode === 'RESET_PASSWORD') && (
              <p>Back to <span onClick={() => { setAuthMode('LOGIN'); }}>Sign In.</span></p>
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
