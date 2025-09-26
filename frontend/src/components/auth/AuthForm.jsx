import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';
import { styles } from '../../styles/styles';

export const AuthForm = () => {
  const { login, register, isLoading } = useAuth();
  const { currentTheme } = useTheme();
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    username: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (authMode === 'login') {
        await login(authForm.email, authForm.password);
      } else {
        await register(authForm.email, authForm.password, authForm.username);
      }
      setAuthForm({ email: '', password: '', username: '' });
    } catch (error) {
      setError(error.message || 'Authentication failed');
    }
  };

  const dynamicStyles = {
    ...styles,
    container: {
      minHeight: '100vh',
      background: currentTheme.gradient,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    submitButton: {
      width: '100%',
      backgroundColor: currentTheme.primary,
      color: 'white',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px'
    },
    navButtonActive: {
      backgroundColor: currentTheme.primary,
      color: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  return (
    <div style={dynamicStyles.container}>
      <div style={dynamicStyles.innerContainer}>
        <div style={{ maxWidth: '400px', margin: '0 auto', paddingTop: '60px' }}>
          <div style={dynamicStyles.card}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ ...dynamicStyles.title, fontSize: '2rem', marginBottom: '8px' }}>
                Sportsbook Tracker
              </h1>
              <p style={dynamicStyles.subtitle}>Manage all your betting accounts in one place</p>
            </div>

            <div style={{ ...dynamicStyles.navigation, marginBottom: '24px' }}>
              <button
                onClick={() => setAuthMode('login')}
                style={{
                  ...dynamicStyles.navButton,
                  ...(authMode === 'login' ? dynamicStyles.navButtonActive : dynamicStyles.navButtonInactive),
                  flex: 1
                }}
              >
                Login
              </button>
              <button
                onClick={() => setAuthMode('register')}
                style={{
                  ...dynamicStyles.navButton,
                  ...(authMode === 'register' ? dynamicStyles.navButtonActive : dynamicStyles.navButtonInactive),
                  flex: 1
                }}
              >
                Register
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid #ef4444',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#ef4444',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={dynamicStyles.formGroup}>
                <label style={dynamicStyles.label}>Email</label>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                  style={dynamicStyles.input}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              {authMode === 'register' && (
                <div style={dynamicStyles.formGroup}>
                  <label style={dynamicStyles.label}>Username</label>
                  <input
                    type="text"
                    value={authForm.username}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                    style={dynamicStyles.input}
                    placeholder="Enter a username"
                    required
                  />
                </div>
              )}

              <div style={dynamicStyles.formGroup}>
                <label style={dynamicStyles.label}>Password</label>
                <input
                  type="password"
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                  style={dynamicStyles.input}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                style={{
                  ...dynamicStyles.submitButton,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Create Account')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};