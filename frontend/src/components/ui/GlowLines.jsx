import React, { useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export const GlowLines = () => {
  const { glowLinesEnabled, currentTheme } = useTheme();

  useEffect(() => {
    // Don't render styles if currentTheme is not loaded yet
    if (!currentTheme || !currentTheme.glowColor) {
      return;
    }

    // Inject glow line styles with current theme colors
    const styleId = 'glow-line-styles';
    let styleElement = document.getElementById(styleId);
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const glowLineStyles = `
      @keyframes glowPulse1 {
        0%, 100% { 
          opacity: 0.4;
          transform: rotate(25deg) scale(1) translateZ(0);
        }
        50% { 
          opacity: 0.8;
          transform: rotate(25deg) scale(1.1) translateZ(0);
        }
      }
      
      @keyframes glowPulse2 {
        0%, 100% { 
          opacity: 0.3;
          transform: rotate(-20deg) scale(1) translateZ(0);
        }
        50% { 
          opacity: 0.7;
          transform: rotate(-20deg) scale(1.08) translateZ(0);
        }
      }
      
      @keyframes glowPulse3 {
        0%, 100% { 
          opacity: 0.35;
          transform: rotate(45deg) scale(1) translateZ(0);
        }
        50% { 
          opacity: 0.75;
          transform: rotate(45deg) scale(1.12) translateZ(0);
        }
      }

      .glow-line {
        position: absolute;
        pointer-events: none;
        will-change: transform, opacity;
        backface-visibility: hidden;
        transform-style: preserve-3d;
      }
      
      .glow-line::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: inherit;
        border-radius: inherit;
        box-shadow: 0 0 20px ${currentTheme.glowColor}60, 0 0 40px ${currentTheme.glowColor}30;
        opacity: 0.6;
      }
      
      .glow-line-1 {
        width: 4px;
        height: 120vh;
        top: -10vh;
        left: 10%;
        background: linear-gradient(180deg, transparent 0%, ${currentTheme.glowColor}80 20%, ${currentTheme.glowColor}60 50%, ${currentTheme.glowColor}80 80%, transparent 100%);
        border-radius: 50% 50% 50% 50% / 60% 40% 60% 40%;
        animation: glowPulse1 4s ease-in-out infinite;
        animation-delay: 0s;
      }
      
      .glow-line-2 {
        width: 3px;
        height: 100vh;
        top: -5vh;
        right: 15%;
        background: linear-gradient(180deg, transparent 0%, ${currentTheme.glowColor}70 25%, ${currentTheme.glowColor}50 50%, ${currentTheme.glowColor}70 75%, transparent 100%);
        border-radius: 50% 50% 50% 50% / 70% 30% 70% 30%;
        animation: glowPulse2 5s ease-in-out infinite;
        animation-delay: 1.5s;
      }
      
      .glow-line-3 {
        width: 5px;
        height: 110vh;
        top: -8vh;
        left: 45%;
        background: linear-gradient(180deg, transparent 0%, ${currentTheme.glowColor}75 30%, ${currentTheme.glowColor}55 50%, ${currentTheme.glowColor}75 70%, transparent 100%);
        border-radius: 50% 50% 50% 50% / 80% 20% 80% 20%;
        animation: glowPulse3 4.5s ease-in-out infinite;
        animation-delay: 3s;
      }

      @media (prefers-reduced-motion: reduce) {
        .glow-line {
          animation: none;
          opacity: 0.2;
          transform: translateZ(0);
        }
      }
      
      @media (max-width: 768px) {
        .glow-line {
          width: 2px;
        }
        .glow-line-3 {
          width: 3px;
        }
      }
    `;

    styleElement.textContent = glowLineStyles;

    return () => {
      // Cleanup on unmount
      const element = document.getElementById(styleId);
      if (element) {
        element.remove();
      }
    };
  }, [currentTheme]); // Include full currentTheme object in dependencies
  
  if (!glowLinesEnabled || !currentTheme) return null;

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      pointerEvents: 'none',
      zIndex: 0,
      overflow: 'hidden'
    }}>
      <div className="glow-line glow-line-1"></div>
      <div className="glow-line glow-line-2"></div>
      <div className="glow-line glow-line-3"></div>
    </div>
  );
};