import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { transactionsService } from '../../services/transactions.service';
import { styles } from '../../styles/styles';
import { ITEMS_PER_PAGE } from '../../utils/constants';
import { usePagination } from '../../hooks/usePagination';

export const TransactionHistory = ({ account, accountKey, onUpdate }) => {
  const { currentTheme } = useTheme();
  const [isDeleting, setIsDeleting] = useState(null);

  const transactions = account.transactions ? 
    [...account.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)) : 
    [];

  const { 
    currentPage, 
    setCurrentPage, 
    paginatedItems: paginatedTransactions, 
    totalPages 
  } = usePagination(transactions, ITEMS_PER_PAGE);

  const handleDeleteTransaction = async (transactionId) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      setIsDeleting(transactionId);
      try {
        await transactionsService.deleteTransaction(transactionId);
        if (onUpdate) await onUpdate();
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'deposit':
      case 'bonus-credit':
      case 'historical-win':
        return '#22c55e'; // Always green for wins/deposits
      case 'withdrawal':
      case 'bet':
      case 'historical-loss':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  };

  const getTransactionSymbol = (type) => {
    switch (type) {
      case 'deposit':
      case 'bonus-credit':
      case 'historical-win':
        return '+';
      case 'withdrawal':
      case 'bet':
      case 'historical-loss':
        return '-';
      default:
        return '';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTransactionType = (type) => {
    return type.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Component styles using the existing styles system
  const containerStyles = {
    marginBottom: '32px'
  };

  const headerStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  };

  const titleStyles = {
    ...styles.sectionTitle,
    margin: 0
  };

  const subtitleStyles = {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '4px 0 0 0'
  };

  const paginationStyles = {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  };

  const paginationButtonStyles = {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid #334155',
    color: '#c4b5fd',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
    fontWeight: '500'
  };

  const paginationTextStyles = {
    color: '#94a3b8',
    fontSize: '14px',
    fontWeight: '500'
  };

  const transactionCardStyles = {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #475569',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
    position: 'relative'
  };

  const transactionHeaderStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  };

  const transactionInfoStyles = {
    flex: 1
  };

  const transactionAmountStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px'
  };

  const amountTextStyles = {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0
  };

  const typeTextStyles = {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'capitalize',
    fontWeight: '500'
  };

  const dateTextStyles = {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  };

  const descriptionStyles = {
    color: '#94a3b8',
    margin: '8px 0 0 0',
    lineHeight: '1.3',
    fontSize: '14px'
  };

  const deleteButtonStyles = {
    padding: '6px 12px',
    backgroundColor: 'rgba(100, 116, 139, 0.5)',
    border: '1px solid #64748b',
    borderRadius: '6px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  };

  if (transactions.length === 0) {
    return (
      <div style={containerStyles}>
        <h4 style={titleStyles}>Transaction History</h4>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>
            No transactions recorded yet.
          </p>
        </div>
      </div>
    );
  }

  const totalTransactions = transactions.length;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalTransactions);

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <div>
          <h4 style={titleStyles}>Transaction History ({totalTransactions} total)</h4>
          <p style={subtitleStyles}>
            Showing {startIndex}-{endIndex} of {totalTransactions} transactions
          </p>
        </div>
        
        {/* Pagination Controls */}
        {transactions.length > ITEMS_PER_PAGE && (
          <div style={paginationStyles}>
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage <= 1}
              style={{
                ...paginationButtonStyles,
                opacity: currentPage <= 1 ? 0.5 : 1,
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => {
                if (currentPage > 1) {
                  e.target.style.backgroundColor = 'rgba(51, 65, 85, 0.7)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
              }}
            >
              ← Previous
            </button>
            <span style={paginationTextStyles}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              style={{
                ...paginationButtonStyles,
                opacity: currentPage >= totalPages ? 0.5 : 1,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => {
                if (currentPage < totalPages) {
                  e.target.style.backgroundColor = 'rgba(51, 65, 85, 0.7)';
                }
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = 'rgba(30, 41, 59, 0.5)';
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Transaction Cards */}
      <div>
        {paginatedTransactions.map((transaction) => (
          <div key={transaction.id} style={transactionCardStyles}>
            <div style={transactionHeaderStyles}>
              <div style={transactionInfoStyles}>
                <div style={transactionAmountStyles}>
                  <span style={{
                    ...amountTextStyles,
                    color: getTransactionColor(transaction.type)
                  }}>
                    {getTransactionSymbol(transaction.type)}{formatCurrency(transaction.amount)}
                  </span>
                  <span style={typeTextStyles}>
                    {formatTransactionType(transaction.type)}
                  </span>
                  <span style={dateTextStyles}>
                    {formatDate(transaction.date)}
                  </span>
                </div>
                <p style={descriptionStyles}>
                  {transaction.description || 'No description'}
                </p>
              </div>
              
              {/* Delete Button */}
              <button
                onClick={() => handleDeleteTransaction(transaction.id)}
                disabled={isDeleting === transaction.id}
                style={{
                  ...deleteButtonStyles,
                  opacity: isDeleting === transaction.id ? 0.6 : 1
                }}
                onMouseOver={(e) => {
                  if (isDeleting !== transaction.id) {
                    e.target.style.backgroundColor = 'rgba(100, 116, 139, 0.7)';
                    e.target.style.color = 'white';
                  }
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'rgba(100, 116, 139, 0.5)';
                  e.target.style.color = '#94a3b8';
                }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};