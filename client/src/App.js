import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import OfficerDashboard from './pages/OfficerDashboard';
import VendorDashboard from './pages/VendorDashboard';
import ProposalsReviewPage from './pages/ProposalsReviewPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/officer-dashboard" element={<OfficerDashboard />} />
        <Route path="/vendor-dashboard" element={<VendorDashboard />} />
        <Route path="/requests/:requestId/proposals" element={<ProposalsReviewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;


// routes/App.js (or where you define routes)

