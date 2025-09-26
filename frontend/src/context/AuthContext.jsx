import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';

// Create and export the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkExistingToken();
  }, []);

  const checkExistingToken = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Validate token by decoding it
        const userData = await authService.validateToken(token);
        setUser({ ...userData, token });
      } catch (error) {
        console.error('Token validation failed:', error);
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setIsLoading(false);
  };

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password, username) => {
    setIsLoading(true);
    try {
      const response = await authService.register(email, password, username);
      localStorage.setItem('token', response.token);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};