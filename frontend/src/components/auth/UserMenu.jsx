import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../context/ThemeContext';

export const UserMenu = () => {
  const { user, logout } = useAuth();
  const { currentTheme, currentThemeKey, themes, changeTheme, glowLinesEnabled, toggleGlowLines } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // User menu styles
  const userMenuStyles = {
    userButton: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      backgroundColor: 'rgba(30, 41, 59, 0.5)',
      backdropFilter: 'blur(10px)',
      border: '1px solid #334155',
      borderRadius: '8px',
      color: 'white',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      fontWeight: '500'
    },
    userButtonHover: {
      backgroundColor: 'rgba(30, 41, 59, 0.8)'
    },
    avatar: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontWeight: 'bold',
      fontSize: '14px'
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      right: '0',
      marginTop: '8px',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid #334155',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
      minWidth: '280px',
      zIndex: 1000,
      overflow: 'hidden'
    },
    dropdownHeader: {
      padding: '16px',
      borderBottom: '1px solid #475569',
      backgroundColor: 'rgba(51, 65, 85, 0.5)'
    },
    dropdownSection: {
      padding: '12px'
    },
    sectionTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '8px'
    },
    themeGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px'
    },
    themeOption: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '13px',
      backgroundColor: 'transparent',
      border: 'none',
      color: 'white',
      width: '100%',
      textAlign: 'left'
    },
    themeOptionHover: {
      backgroundColor: 'rgba(51, 65, 85, 0.5)'
    },
    colorDot: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      flexShrink: 0
    },
    logoutButton: {
      width: '100%',
      padding: '10px 16px',
      backgroundColor: 'transparent',
      color: '#f87171',
      border: '1px solid #374151',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '8px'
    },
    logoutButtonHover: {
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      borderColor: '#f87171'
    }
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest('.user-menu-container')) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserMenu]);

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <div className="user-menu-container" style={{ position: 'relative' }}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        style={{
          ...userMenuStyles.userButton,
          ...(showUserMenu ? userMenuStyles.userButtonHover : {}),
          borderColor: showUserMenu ? currentTheme.primary : '#334155'
        }}
        onMouseEnter={(e) => {
          if (!showUserMenu) {
            Object.assign(e.target.style, userMenuStyles.userButtonHover);
          }
        }}
        onMouseLeave={(e) => {
          if (!showUserMenu) {
            Object.assign(e.target.style, userMenuStyles.userButton);
            e.target.style.borderColor = '#334155';
          }
        }}
      >
        <div style={{
          ...userMenuStyles.avatar,
          backgroundColor: currentTheme.primary
        }}>
          {user?.username ? user.username.charAt(0).toUpperCase() : 
           user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
        </div>
        <span>{user?.username || user?.email || 'User'}</span>
        <svg 
          style={{ 
            width: '16px', 
            height: '16px', 
            transition: 'transform 0.2s ease',
            transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'
          }} 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showUserMenu && (
        <div style={userMenuStyles.dropdown}>
          <div style={userMenuStyles.dropdownHeader}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
              {user?.username || user?.email || 'User Account'}
            </div>
            {user?.email && user?.username && (
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {user.email}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {currentTheme.name} Theme
            </div>
          </div>

          <div style={userMenuStyles.dropdownSection}>
            <div style={userMenuStyles.sectionTitle}>Choose Theme</div>
            <div style={userMenuStyles.themeGrid}>
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => {
                    changeTheme(key);
                  }}
                  style={{
                    ...userMenuStyles.themeOption,
                    border: currentThemeKey === key ? `1px solid ${theme.primary}` : '1px solid transparent',
                    backgroundColor: currentThemeKey === key ? theme.primary + '20' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (currentThemeKey !== key) {
                      Object.assign(e.target.style, userMenuStyles.themeOptionHover);
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentThemeKey !== key) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div 
                    style={{
                      ...userMenuStyles.colorDot,
                      background: theme.gradient
                    }}
                  />
                  <span>{theme.name}</span>
                  {currentThemeKey === key && (
                    <svg style={{ width: '14px', height: '14px', marginLeft: 'auto' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #475569' }}>
              <div style={userMenuStyles.sectionTitle}>Effects</div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#c4b5fd',
                fontSize: '13px',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(51, 65, 85, 0.5)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={glowLinesEnabled}
                  onChange={(e) => toggleGlowLines(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    accentColor: currentTheme.primary
                  }}
                />
                <span>Animated Glow Lines</span>
              </label>
            </div>

            <button
              onClick={handleLogout}
              style={userMenuStyles.logoutButton}
              onMouseEnter={(e) => Object.assign(e.target.style, userMenuStyles.logoutButtonHover)}
              onMouseLeave={(e) => Object.assign(e.target.style, userMenuStyles.logoutButton)}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};