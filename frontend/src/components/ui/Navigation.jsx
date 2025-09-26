import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { styles } from '../../styles/styles';

export const Navigation = ({ activeTab, setActiveTab }) => {
  const { currentTheme } = useTheme();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'accounts', label: 'Accounts' },
    { id: 'add-transaction', label: 'Add Transaction' },
    { id: 'bulk-import', label: 'Bulk Import' }
  ];

  const dynamicStyles = {
    navButtonActive: {
      backgroundColor: currentTheme.primary,
      color: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }
  };

  return (
    <div style={styles.navigation}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            ...styles.navButton,
            ...(activeTab === tab.id ? dynamicStyles.navButtonActive : styles.navButtonInactive)
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};