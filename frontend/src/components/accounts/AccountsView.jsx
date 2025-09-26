import React, { useState, useEffect } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { AccountSelector } from './AccountSelector';
import { BetHistory } from './BetHistory';
import { TransactionHistory } from './TransactionHistory';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { accountsService } from '../../services/accounts.service';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const AccountsView = () => {
  const { accounts, isLoading, error, refreshAccounts } = useAccounts();
  const [selectedAccount, setSelectedAccount] = useState('draftkings1');

  // Update selected account if it doesn't exist
  useEffect(() => {
    if (accounts && !accounts[selectedAccount]) {
      const firstAccount = Object.keys(accounts)[0];
      if (firstAccount) {
        setSelectedAccount(firstAccount);
      }
    }
  }, [accounts, selectedAccount]);

  const handleClearAccountData = async (accountKey) => {
    const accountName = accounts[accountKey]?.name;
    if (window.confirm(`Are you sure you want to clear all data for ${accountName}? This cannot be undone.`)) {
      try {
        await accountsService.clearAccount(accountKey);
        await refreshAccounts();
      } catch (error) {
        console.error('Error clearing account:', error);
        alert('Failed to clear account data.');
      }
    }
  };

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div style={{ 
        color: '#ef4444', 
        textAlign: 'center', 
        padding: '40px 0',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        Error loading accounts: {error}
      </div>
    );
  }

  if (!accounts || Object.keys(accounts).length === 0) {
    return (
      <Card>
        <h3 style={styles.sectionTitle}>No Accounts Found</h3>
        <p style={{ color: '#94a3b8' }}>No betting accounts have been set up yet.</p>
      </Card>
    );
  }

  return (
    <div>
      {/* Account Selector */}
      <AccountSelector 
        accounts={accounts}
        selectedAccount={selectedAccount}
        setSelectedAccount={setSelectedAccount}
      />

      {/* Selected Account Details */}
      {accounts[selectedAccount] && (
        <Card>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px' 
          }}>
            <h3 style={styles.sectionTitle}>
              {accounts[selectedAccount].name} - History
            </h3>
            <button
              onClick={() => handleClearAccountData(selectedAccount)}
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '500',
                backgroundColor: '#dc2626',
                color: 'white'
              }}
            >
              Clear Account Data
            </button>
          </div>

          {/* Active Bets - MOVED TO TOP */}
          <BetHistory 
            account={accounts[selectedAccount]}
            accountKey={selectedAccount}
            onUpdate={refreshAccounts}
          />

          {/* Transaction History - MOVED TO BOTTOM */}
          <TransactionHistory 
            account={accounts[selectedAccount]}
            accountKey={selectedAccount}
            onUpdate={refreshAccounts}
          />
        </Card>
      )}
    </div>
  );
};