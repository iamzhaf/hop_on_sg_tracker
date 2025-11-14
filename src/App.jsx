import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './components/Landingpage';
import DashboardPage from './components/DashboardPage';

import './App.css'

function App() {

  return (
      <Routes>
        {/* Home page - shows list of bus stops */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Dashboard page - shows bus arrivals for specific stop */}
        <Route path="/dashboards/:busStopCode/:description" element={<DashboardPage />} />
      </Routes>
  );
}

export default App
