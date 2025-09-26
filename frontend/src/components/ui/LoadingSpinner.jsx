import React from 'react';
import { styles } from '../../styles/styles';

export const LoadingSpinner = ({ 
  message = 'Loading...', 
  submessage = 'Please wait while we load your data.' 
}) => (
  <div style={styles.innerContainer}>
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      {/* Spinning animation */}
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #334155',
        borderTop: '4px solid #c4b5fd',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 16px'
      }} />
      <h2 style={{ color: 'white', marginBottom: '16px' }}>{message}</h2>
      <p style={{ color: '#c4b5fd' }}>{submessage}</p>
      
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  </div>
);