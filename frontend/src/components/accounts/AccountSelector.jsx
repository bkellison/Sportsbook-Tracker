import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { styles } from '../../styles/styles';

export const AccountSelector = ({ accounts, selectedAccount, setSelectedAccount }) => {
  const { currentTheme } = useTheme();

  const dynamicStyles = {
    tabButtonActive: {
      backgroundColor: currentTheme.primary,
      color: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  return (
    <div style={styles.tabSelector}>
      {Object.entries(accounts).map(([key, account]) => (
        <button
          key={key}
          onClick={() => setSelectedAccount(key)}
          style={{
            ...styles.tabButton,
            ...(selectedAccount === key ? dynamicStyles.tabButtonActive : styles.tabButtonInactive)
          }}
        >
          {account.name}
        </button>
      ))}
    </div>
  );
};