import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { Navigation } from './ui/Navigation';
import { UserMenu } from './auth/UserMenu';
import { AuthForm } from './auth/AuthForm';
import { DashboardView } from './dashboard/DashboardView';
import { AnalyticsView } from './analytics/AnalyticsView';
import { AccountsView } from './accounts/AccountsView';
import { TransactionForm } from './transactions/TransactionForm';
import { BulkImport } from './transactions/BulkImport';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { styles } from '../styles/styles';

export const MainContainer = () => {
  const { user, isLoading } = useAuth();
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Defensive fallback gradient in case currentTheme is still undefined
  const fallbackGradient = 'linear-gradient(135deg, #0f172a 0%, #581c87 50%, #0f172a 100%)';

  const dynamicStyles = {
    ...styles,
    container: {
      minHeight: '100vh',
      background: currentTheme?.background || fallbackGradient, // FIXED: Changed from 'gradient' to 'background'
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      transition: 'background 0.3s ease'
    }
  };

  if (isLoading) {
    return (
      <div style={dynamicStyles.container}>
        <LoadingSpinner message="Initializing..." submessage="Setting up your sportsbook tracker..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={dynamicStyles.container}>
        <AuthForm />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'accounts':
        return <AccountsView />;
      case 'add-transaction':
        return <TransactionForm />;
      case 'bulk-import':
        return <BulkImport />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div style={dynamicStyles.container}>
      <div style={{ ...dynamicStyles.innerContainer, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={dynamicStyles.header}>
          <div>
            <h1 style={dynamicStyles.title}>Sportsbook Tracker</h1>
            <p style={dynamicStyles.subtitle}>Manage all your betting accounts in one place</p>
          </div>
          <UserMenu />
        </div>

        {/* Navigation */}
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Content */}
        <main role="main">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};