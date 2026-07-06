import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Standalone Pages */}
        <Route path="/login" element={<Landing />} />
        <Route path="/watch/:id" element={<Watch />} />
        
        {/* Authenticated Layout */}
        <Route path="/*" element={
          <div className="app-container">
            <Sidebar />
            <Header />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/movies" element={<Movies />} />
                <Route path="/genres" element={<Genres />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/myspace" element={<MySpace />} />
              </Routes>
            </main>
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
