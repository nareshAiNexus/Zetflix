import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Home from './pages/Home';
import Search from './pages/Search';
import Movies from './pages/Movies';
import Genres from './pages/Genres';
import MySpace from './pages/MySpace';
import Landing from './pages/Landing';
import Watch from './pages/Watch';
import Upload from './pages/Upload';
import useAuthStore from './store/useAuthStore';
import './App.css';

function App() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.role === 'ADMIN';

  return (
    <Router>
      <Routes>
        {/* Public Login/Signup Page */}
        <Route path="/login" element={token ? <Navigate to="/" /> : <Landing />} />

        {/* Protected Standalone Watch Page (No Header/Sidebar) */}
        <Route path="/watch/:id" element={!token ? <Navigate to="/login" /> : <Watch />} />
        
        {/* Authenticated Layout */}
        <Route path="/*" element={
          !token ? (
            <Navigate to="/login" />
          ) : (
            <div className="app-container">
              <Sidebar />
              <Header />
              <main>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/movies" element={<Movies />} />
                  <Route path="/genres" element={<Genres />} />
                  <Route path="/upload" element={isAdmin ? <Upload /> : <Navigate to="/" />} />
                  <Route path="/myspace" element={<MySpace />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </main>
            </div>
          )
        } />
      </Routes>
    </Router>
  );
}

export default App;
