import React from 'react';
import { styles } from '../../styles/styles';

export const Card = ({ children, style = {}, className = '', onClick = null }) => {
  const cardStyle = {
    ...styles.card,
    ...style,
    ...(onClick && { cursor: 'pointer' })
  };

  return (
    <div 
      style={cardStyle} 
      className={`card ${className}`}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 8px 25px -5px rgba(0, 0, 0, 0.3)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = styles.card.boxShadow || 'none';
        }
      }}
    >
      {children}
    </div>
  );
};