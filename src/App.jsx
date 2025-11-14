import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/Landingpage';
import DashboardPage from './components/DashboardPage';

import './App.css'

function App() {

  return (
    <Router>
      <Routes>
        {/* Home page - shows list of bus stops */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard page - shows bus arrivals for specific stop */}
        <Route path="/dashboards/:busStopCode/:description" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App
