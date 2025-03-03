import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Компоненты
import Header from './components/Header/Header';
import Navigation from './components/Navigation/Navigation';

// Страницы
import Dashboard from './pages/Dashboard';
import FlightsPage from './pages/FlightsPage';
import SSIMUploadPage from './pages/SSIMUploadPage';

function App() {
  return (
    <Router>
      <div className="app">
        <Header />
        <div className="main-container">
          <Navigation />
          <main className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/flights" element={<FlightsPage />} />
              <Route path="/upload" element={<SSIMUploadPage />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;