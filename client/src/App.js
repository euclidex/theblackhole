import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import VendorDashboard from './pages/VendorDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import ProposalsReviewPage from './pages/ProposalsReviewPage';
import VendorProposalDetailsPage from './pages/VendorProposalDetailsPage';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/vendor-dashboard"
          element={
            <PrivateRoute role="vendor">
              <VendorDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/officer-dashboard"
          element={
            <PrivateRoute role="procurement">
              <OfficerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests/:requestId/proposals"
          element={
            <PrivateRoute role="procurement">
              <ProposalsReviewPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/requests/:requestId/my-proposals"
          element={
            <PrivateRoute role="vendor">
              <VendorProposalDetailsPage />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;


// routes/App.js (or where you define routes)

