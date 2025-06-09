import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import jwtDecode from 'jwt-decode';

const PrivateRoute = ({ children, role }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasCorrectRole, setHasCorrectRole] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setIsAuthenticated(false);
      setHasCorrectRole(false);
      setIsLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp < currentTime) {
        // Token has expired
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        setIsAuthenticated(false);
        setHasCorrectRole(false);
      } else {
        setIsAuthenticated(true);
        setHasCorrectRole(decoded.role === role);
      }
    } catch (error) {
      console.error('Error decoding token:', error);
      setIsAuthenticated(false);
      setHasCorrectRole(false);
    }

    setIsLoading(false);
  }, [role]);

  if (isLoading) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!hasCorrectRole) {
    return <Navigate to={role === 'vendor' ? '/officer-dashboard' : '/vendor-dashboard'} />;
  }

  return children;
};

export default PrivateRoute; 