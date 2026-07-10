import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { fetchUserProfile, updateUserProfile } from '../api/api';
import './MySpace.css';

const MySpace = () => {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const updateProfileState = useAuthStore((state) => state.updateProfileState);

  // States
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Editing Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDob, setEditDob] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Fetch Profile Details
  const loadProfile = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await fetchUserProfile();
      setProfile(data);
      setEditName(data.name);
      setEditDob(data.dob || '');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load profile. Please try logging in again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSaveLoading(true);
    try {
      await updateUserProfile(editName, editDob);
      // Update local storage and Zustund state
      updateProfileState(editName);
      setIsEditing(false);
      // Reload profile from DB to recalculate age
      await loadProfile();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile details.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container myspace-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderColor: '#e50914', borderTopColor: 'transparent', borderWidth: '4px' }} />
      </div>
    );
  }

  const isAdmin = profile?.role === 'ADMIN';
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile?.name || 'Zetflix')}&backgroundColor=1E90FF`;

  return (
    <div className="page-container myspace-page">
      {errorMsg && (
        <div style={{
          backgroundColor: 'rgba(229, 9, 20, 0.2)',
          borderLeft: '4px solid #E50914',
          color: '#ff8888',
          padding: '16px',
          borderRadius: '4px',
          marginBottom: '20px',
        }}>
          {errorMsg}
        </div>
      )}

      {/* Profile Header section */}
      <div className="profile-header">
        <div className="profile-avatar-container">
          <img src={avatarUrl} alt="User Avatar" className="profile-avatar" />
        </div>
        <div className="profile-info">
          <h2>{profile?.name}</h2>
          <p className="profile-email">{profile?.email}</p>
          <div className="profile-badges">
            <span className="badge plan-badge" style={{ backgroundColor: isAdmin ? '#8a2be2' : '#e50914' }}>
              {isAdmin ? '🛡️ Admin Account' : '★ Premium Streamer'}
            </span>
            {profile?.dob && (
              <span className="badge member-badge">
                🎂 Age: {profile.age} years old ({profile.dob})
              </span>
            )}
          </div>
        </div>
        <div className="profile-actions">
          <button className="manage-account-btn" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel Edit' : 'Edit Profile'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      {/* Edit Profile Form */}
      {isEditing && (
        <div style={{ background: '#181818', padding: '30px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '1.4rem' }}>Edit Personal Details</h3>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a3a3a3' }}>Full Name</label>
              <input 
                type="text" 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                required
                style={{ background: '#333', border: 'none', borderRadius: '4px', padding: '10px', color: 'white' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85rem', color: '#a3a3a3' }}>Date of Birth</label>
              <input 
                type="date" 
                value={editDob} 
                onChange={(e) => setEditDob(e.target.value)}
                required
                style={{ background: '#333', border: 'none', borderRadius: '4px', padding: '10px', color: 'white' }}
              />
            </div>
            <button 
              type="submit" 
              className="upload-submit-btn" 
              disabled={saveLoading}
              style={{ width: '120px', marginTop: '10px' }}
            >
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      <div className="myspace-content">
        
        {/* Continue Watching Section */}
        {profile?.continueWatching && (
          <section className="myspace-section" style={{ background: 'linear-gradient(90deg, #181818, #0a0a0a)', padding: '24px', borderRadius: '6px', border: '1px solid rgba(229, 9, 20, 0.15)', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div 
              style={{ 
                width: '180px', 
                height: '100px', 
                backgroundImage: `url(${profile.continueWatching.thumbnailUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            />
            <div style={{ flexGrow: 1 }}>
              <span style={{ fontSize: '0.75rem', color: '#e50914', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Continue Watching</span>
              <h3 style={{ margin: '4px 0 10px 0', fontSize: '1.6rem' }}>{profile.continueWatching.title}</h3>
              
              {/* Progress bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '300px' }}>
                <div style={{ height: '4px', flexGrow: 1, backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    backgroundColor: '#e50914', 
                    width: `${(profile.continueWatching.lastWatchedTimeSeconds / profile.continueWatching.totalDurationSeconds) * 100}%` 
                  }} />
                </div>
                <span style={{ fontSize: '0.8rem', color: '#a3a3a3' }}>
                  {Math.floor(profile.continueWatching.lastWatchedTimeSeconds / 60)}m left
                </span>
              </div>
            </div>
            <button 
              className="manage-account-btn" 
              onClick={() => navigate(`/watch/${profile.continueWatching.movieId}?t=${profile.continueWatching.lastWatchedTimeSeconds}`)}
              style={{ alignSelf: 'center' }}
            >
              Resume Playback ▶
            </button>
          </section>
        )}

        {/* Recently Watched History List */}
        <section className="myspace-section" style={{ marginTop: '30px' }}>
          <div className="section-header">
            <h3>Recently Watched</h3>
          </div>
          <div className="movies-grid">
            {profile?.recentlyWatched && profile.recentlyWatched.length > 0 ? (
              profile.recentlyWatched.map(item => {
                const percent = Math.min(100, Math.round((item.lastWatchedTimeSeconds / item.totalDurationSeconds) * 100));
                return (
                  <div key={item.movieId} className="movie-card" onClick={() => navigate(`/watch/${item.movieId}?t=${item.lastWatchedTimeSeconds}`)}>
                    <div 
                      className="movie-card-img" 
                      style={{ 
                        backgroundImage: `url(${item.thumbnailUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&q=80'})`,
                        position: 'relative'
                      }}
                    >
                      <div className="movie-card-overlay">
                        <button className="play-btn">▶</button>
                      </div>
                      
                      {/* Playback progress bar on bottom of the card */}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', backgroundColor: '#333' }}>
                        <div style={{ height: '100%', backgroundColor: '#e50914', width: `${percent}%` }} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px' }}>
                      <h4 style={{ fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{item.title}</h4>
                      {item.completed && <span style={{ color: '#32CD32', fontSize: '0.8rem', fontWeight: 'bold' }}>✓ Done</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: '#666', gridColumn: 'span 2' }}>
                You haven't watched any movies yet. Browse the catalog to start streaming!
              </p>
            )}
          </div>
        </section>

        {/* Preferences / Movies you love */}
        {profile?.preferredGenres && profile.preferredGenres.length > 0 && (
          <section className="myspace-section">
            <div className="section-header">
              <h3>Movies You Love</h3>
            </div>
            <p style={{ color: '#a3a3a3', fontSize: '0.95rem', marginBottom: '15px' }}>Your favorite genres based on your watch history:</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {profile.preferredGenres.map((genre, idx) => (
                <span 
                  key={genre} 
                  style={{ 
                    background: idx === 0 ? 'rgba(229, 9, 20, 0.15)' : 'rgba(255, 255, 255, 0.05)', 
                    border: idx === 0 ? '1px solid #e50914' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: idx === 0 ? '#ff8888' : '#e5e5e5',
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    textTransform: 'capitalize'
                  }}
                >
                  🔥 {genre.replace('_', ' ').toLowerCase()}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Quick Upload Link (Admins Only) */}
        {isAdmin && (
          <section className="myspace-section upload-section">
            <div className="section-header">
              <h3>Upload Movie</h3>
            </div>
            <div className="upload-container" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <p className="upload-desc" style={{ marginBottom: '24px' }}>
                You are logged in as an <strong>Administrator</strong>. You have permissions to add movies to the catalog and upload video files.
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
        )}

        {/* Playback Settings mock */}
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
              <button className="setting-action" onClick={() => setIsEditing(false)}>Manage</button>
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
