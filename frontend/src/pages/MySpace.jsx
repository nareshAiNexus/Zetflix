import React from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useMovieStore from '../store/useMovieStore';
import './MySpace.css';

const MySpace = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { movies, fetchMovies } = useMovieStore();

  // Derive user profile from auth store
  const user = {
    name: authUser?.name || 'Zetflix User',
    email: authUser?.email || 'user@zetflix.com',
    plan: 'Premium Ultra HD',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authUser?.name || 'Zetflix')}&backgroundColor=1E90FF`,
    joinDate: 'July 2026',
  };

  // Load movies for watchlist display
  React.useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);

  // Get READY movies as a basic watchlist (most recent 4)
  const watchlistMovies = [...movies]
    .filter(m => m.videoStatus === 'READY')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 4);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container myspace-page">
      <div className="profile-header">
        <div className="profile-avatar-container">
          <img src={user.avatar} alt="User Avatar" className="profile-avatar" />
          <button className="edit-avatar-btn">✎</button>
        </div>
        <div className="profile-info">
          <h2>{user.name}</h2>
          <p className="profile-email">{user.email}</p>
          <div className="profile-badges">
            <span className="badge plan-badge">★ {user.plan}</span>
            <span className="badge member-badge">Member since {user.joinDate}</span>
          </div>
        </div>
        <div className="profile-actions">
          <button className="manage-account-btn">Manage Account</button>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      <div className="myspace-content">
        {/* Watchlist — shows real READY movies from the catalog */}
        <section className="myspace-section">
          <div className="section-header">
            <h3>My Watchlist</h3>
            <button className="view-all-btn" onClick={() => navigate('/movies')}>View All</button>
          </div>
          <div className="movies-grid">
            {watchlistMovies.length > 0 ? (
              watchlistMovies.map(movie => (
                <div key={movie.id} className="movie-card" onClick={() => navigate(`/watch/${movie.id}`, { state: { movie: {
                  id: movie.id,
                  title: movie.title,
                  imageUrl: movie.thumbnailUrl,
                  hlsUrl: movie.hlsUrl,
                  videoStatus: movie.videoStatus,
                }} })}>
                  <div className="movie-card-img" style={{ backgroundImage: `url(${movie.thumbnailUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'})` }}>
                    <div className="movie-card-overlay">
                      <button className="play-btn">▶</button>
                    </div>
                  </div>
                  <h4>{movie.title}</h4>
                </div>
              ))
            ) : (
              <p style={{ color: '#666', gridColumn: 'span 2' }}>
                No movies in your watchlist yet. Browse <span style={{ color: '#1E90FF', cursor: 'pointer' }} onClick={() => navigate('/movies')}>Movies</span> to find something to watch!
              </p>
            )}
          </div>
        </section>

        {/* Quick Upload Link */}
        <section className="myspace-section upload-section">
          <div className="section-header">
            <h3>Upload Movie</h3>
          </div>
          <div className="upload-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <p className="upload-desc" style={{ marginBottom: '24px' }}>
              Upload your movies to share them with everyone on Zetflix.
            </p>
            <button 
              className="setting-action upload-submit-btn" 
              onClick={() => navigate('/upload')}
              style={{ maxWidth: '300px', margin: '0 auto' }}
            >
              Go to Upload Page →
            </button>
          </div>
        </section>

        {/* Account Settings */}
        <section className="myspace-section">
          <div className="section-header">
            <h3>Account Settings</h3>
          </div>
          <div className="settings-grid">
            <div className="setting-card">
              <span className="setting-icon">🔒</span>
              <div className="setting-details">
                <h4>Password & Security</h4>
                <p>Update your password and secure your account</p>
              </div>
              <button className="setting-action">Update</button>
            </div>

            <div className="setting-card">
              <span className="setting-icon">📺</span>
              <div className="setting-details">
                <h4>Playback Settings</h4>
                <p>Data usage, autoplay, and video quality</p>
              </div>
              <button className="setting-action">Edit</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MySpace;
