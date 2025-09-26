import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import { useTheme } from '../../context/ThemeContext';
import { transactionsService } from '../../services/transactions.service';
import { styles } from '../../styles/styles';
import { TRANSACTION_TYPES } from '../../utils/constants';

export const TransactionForm = () => {
  const { accounts, refreshAccounts } = useAccounts();
  const { currentTheme } = useTheme();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [transactionForm, setTransactionForm] = useState({
    type: TRANSACTION_TYPES.DEPOSIT,
    amount: '',
    description: '',
    account: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // All available transaction types
  const transactionTypes = [
    { value: TRANSACTION_TYPES.DEPOSIT, label: 'Deposit' },
    { value: TRANSACTION_TYPES.WITHDRAWAL, label: 'Withdrawal' },
    { value: TRANSACTION_TYPES.BET, label: 'Bet' },
    { value: TRANSACTION_TYPES.BONUS_BET, label: 'Bonus Bet' },
    { value: TRANSACTION_TYPES.BONUS_CREDIT, label: 'Bonus Credit' },
    { value: TRANSACTION_TYPES.HISTORICAL_WIN, label: 'Historical Win' },
    { value: TRANSACTION_TYPES.HISTORICAL_LOSS, label: 'Historical Loss' }
  ];

  // Set account from localStorage or first available account as default
  useEffect(() => {
    if (accounts && Object.keys(accounts).length > 0) {
      // Try to get last used account from localStorage
      const lastUsedAccount = localStorage.getItem('lastUsedAccount');
      const lastUsedTransactionType = localStorage.getItem('lastUsedTransactionType');
      
      // Use last used account if it still exists, otherwise use first available
      const accountToUse = (lastUsedAccount && accounts[lastUsedAccount]) 
        ? lastUsedAccount 
        : Object.keys(accounts)[0];
      
      // Use last used transaction type if available
      const transactionTypeToUse = lastUsedTransactionType || TRANSACTION_TYPES.DEPOSIT;
      
      setSelectedAccount(accountToUse);
      setTransactionForm(prev => ({ 
        ...prev, 
        account: accountToUse,
        type: transactionTypeToUse
      }));
    }
  }, [accounts]);

  const handleInputChange = (field, value) => {
    setTransactionForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Save to localStorage for persistence
    if (field === 'account') {
      setSelectedAccount(value);
      localStorage.setItem('lastUsedAccount', value);
    }
    
    if (field === 'type') {
      localStorage.setItem('lastUsedTransactionType', value);
    }
  };

  const handleAddTransaction = async () => {
    // Validation
    if (!transactionForm.account) {
      setError('Please select an account');
      return;
    }

    const amount = parseFloat(transactionForm.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    if (!transactionForm.type) {
      setError('Please select a transaction type');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await transactionsService.createTransaction(transactionForm);
      await refreshAccounts();

      // Reset form
      setTransactionForm({ 
        type: TRANSACTION_TYPES.DEPOSIT, 
        amount: '', 
        description: '', 
        account: selectedAccount
      });

    } catch (error) {
      console.error('Error adding transaction:', error);
      setError(error.message || 'Failed to add transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get button text based on transaction type
  const getButtonText = () => {
    if (isSubmitting) return 'Adding...';
    
    switch (transactionForm.type) {
      case TRANSACTION_TYPES.DEPOSIT:
        return 'Add Deposit';
      case TRANSACTION_TYPES.WITHDRAWAL:
        return 'Add Withdrawal';
      case TRANSACTION_TYPES.BET:
        return 'Add Bet';
      case TRANSACTION_TYPES.BONUS_BET:
        return 'Add Bonus Bet';
      case TRANSACTION_TYPES.BONUS_CREDIT:
        return 'Add Bonus Credit';
      case TRANSACTION_TYPES.HISTORICAL_WIN:
        return 'Add Historical Win';
      case TRANSACTION_TYPES.HISTORICAL_LOSS:
        return 'Add Historical Loss';
      default:
        return 'Add Transaction';
    }
  };

  // Dynamic styles that match the theme system
  const formContainerStyles = {
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(10px)',
    padding: '32px',
    borderRadius: '16px',
    border: '1px solid #334155',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    position: 'relative'
  };

  const headerStyles = {
    textAlign: 'center',
    marginBottom: '24px'
  };

  const titleStyles = {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
    margin: '0 0 8px 0'
  };

  const subtitleStyles = {
    color: currentTheme?.primary || '#c4b5fd',
    fontSize: '14px',
    margin: 0
  };

  const formGroupStyles = {
    marginBottom: '20px'
  };

  const labelStyles = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#c4b5fd',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const inputStyles = {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#374151',
    border: '1px solid #4b5563',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    boxSizing: 'border-box',
    transition: 'all 0.2s ease',
    outline: 'none'
  };

  const selectStyles = {
    ...inputStyles,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '40px'
  };

  const buttonStyles = {
    width: '100%',
    backgroundColor: currentTheme?.primary || '#a855f7',
    color: 'white',
    fontWeight: '600',
    padding: '14px 20px',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
    border: 'none',
    cursor: isSubmitting ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '16px',
    opacity: isSubmitting ? 0.6 : 1,
    boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)'
  };

  const errorStyles = {
    color: '#ef4444',
    fontSize: '14px',
    marginTop: '8px',
    padding: '8px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '6px'
  };

  // Show loading if accounts aren't loaded yet
  if (!accounts) {
    return (
      <div style={formContainerStyles}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#c4b5fd' }}>Loading accounts...</p>
        </div>
      </div>
    );
  }

  // Show message if no accounts available
  if (Object.keys(accounts).length === 0) {
    return (
      <div style={formContainerStyles}>
        <div style={headerStyles}>
          <h2 style={titleStyles}>Add Transaction</h2>
          <p style={subtitleStyles}>No accounts available</p>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#94a3b8' }}>Please add an account first.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={formContainerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <h2 style={titleStyles}>Add Transaction</h2>
        <p style={subtitleStyles}>
          Adding transaction to: {selectedAccount ? accounts[selectedAccount]?.name : 'Select Account'}
        </p>
      </div>

      {/* Form */}
      <div>
        {/* Account Selection */}
        <div style={formGroupStyles}>
          <label style={labelStyles}>Account</label>
          <select
            value={transactionForm.account}
            onChange={(e) => handleInputChange('account', e.target.value)}
            style={selectStyles}
            disabled={isSubmitting}
            onFocus={(e) => e.target.style.borderColor = currentTheme?.primary || '#a855f7'}
            onBlur={(e) => e.target.style.borderColor = '#4b5563'}
          >
            <option value="">Select Account</option>
            {Object.entries(accounts).map(([key, account]) => (
              <option key={key} value={key}>
                {account.name} (${account.balance?.toFixed(2) || '0.00'})
              </option>
            ))}
          </select>
        </div>

        {/* Transaction Type Selection */}
        <div style={formGroupStyles}>
          <label style={labelStyles}>Type</label>
          <select
            value={transactionForm.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            style={selectStyles}
            disabled={isSubmitting}
            onFocus={(e) => e.target.style.borderColor = currentTheme?.primary || '#a855f7'}
            onBlur={(e) => e.target.style.borderColor = '#4b5563'}
          >
            {transactionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        <div style={formGroupStyles}>
          <label style={labelStyles}>Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={transactionForm.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.00"
            style={inputStyles}
            disabled={isSubmitting}
            onFocus={(e) => e.target.style.borderColor = currentTheme?.primary || '#a855f7'}
            onBlur={(e) => e.target.style.borderColor = '#4b5563'}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={errorStyles}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleAddTransaction}
          disabled={isSubmitting}
          style={buttonStyles}
          onMouseOver={(e) => {
            if (!isSubmitting) {
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 6px 16px rgba(168, 85, 247, 0.5)';
            }
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
          }}
        >
          <Plus size={18} />
          {getButtonText()}
        </button>
      </div>
    </div>
  );
};