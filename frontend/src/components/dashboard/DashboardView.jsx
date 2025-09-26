import React from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { OverviewCards } from './OverviewCards';
import { QuickStats } from './QuickStats';
import { AccountOverview } from './AccountOverview';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { CalculationsService } from '../../utils/calculations';

export const DashboardView = () => {
  const { accounts, isLoading, error } = useAccounts();

  if (isLoading) {
    return <LoadingSpinner message="Loading Dashboard" submessage="Fetching your betting account data..." />;
  }
  
  if (error) {
    return (
      <div style={{ 
        color: '#ef4444', 
        textAlign: 'center', 
        padding: '40px 0',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '8px',
        margin: '20px 0',
        border: '1px solid #ef4444'
      }}>
        <h3 style={{ marginBottom: '8px', color: '#ef4444' }}>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!accounts || Object.keys(accounts).length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '60px 20px',
        backgroundColor: 'rgba(100, 116, 139, 0.1)',
        borderRadius: '12px',
        border: '1px solid #475569'
      }}>
        <h3 style={{ color: 'white', marginBottom: '16px' }}>Welcome to Sportsbook Tracker!</h3>
        <p style={{ color: '#c4b5fd', marginBottom: '24px' }}>
          No betting accounts found. Start by adding some transactions to see your dashboard come to life.
        </p>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Go to "Add Transaction" to get started, or use "Bulk Import" to import existing data.
        </p>
      </div>
    );
  }

  const totals = CalculationsService.getTotals(accounts);

  return (
    <div>
      {/* Overview Cards - 2 rows of 3 cards each */}
      <OverviewCards totals={totals} />
      
      {/* Quick Stats Row */}
      <QuickStats totals={totals} />
      
      {/* Account Overview */}
      <AccountOverview accounts={accounts} />
    </div>
  );
};