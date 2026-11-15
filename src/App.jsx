import { useState } from 'react'
import { Outlet } from 'react-router-dom';
import LandingPage from './components/Landingpage';
import DashboardPage from './components/Dashboardpage';

import './App.css'



function App() {

  return (
    <Outlet />
  );
}

export default App
