import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/Landingpage';
import DashboardPage from './components/DashboardPage';

import './App.css'

function App() {

  return (
    <BrowserRouter basename="/hop_on_sg_tracker">
      <Routes>
        {/* Home page - shows list of bus stops */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard page - shows bus arrivals for specific stop */}
        <Route path="/hop_on_sg_tracker/dashboards/:busStopCode/:description" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App
