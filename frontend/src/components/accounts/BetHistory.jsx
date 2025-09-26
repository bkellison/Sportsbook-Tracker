import React, { useState, useEffect } from 'react';
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { betsService } from '../../services/bets.service';
import { styles } from '../../styles/styles';

export const BetHistory = ({ account, accountKey, onUpdate }) => {
  const { currentTheme } = useTheme();
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [isUpdating, setIsUpdating] = useState(null);
  const [isDeletingBet, setIsDeletingBet] = useState(null);
  const [showWinningsModal, setShowWinningsModal] = useState(null);
  const [winningsAmount, setWinningsAmount] = useState('');

  const fetchBets = async (page = 1) => {
    if (!accountKey) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters = {
        accountKey,
        page,
        limit: 20
      };

      const response = await betsService.getBets(filters);

      if (response && response.bets) {
        setBets(response.bets);
        setPagination(response.pagination);
        setCurrentPage(page);
      } else {
        setBets([]);
        setPagination(null);
      }

    } catch (error) {
      console.error('Error fetching bets:', error);
      setError(error.message);
      setBets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets(1);
  }, [accountKey]);

  const handleMarkWon = (betId, displayAmount) => {
    setShowWinningsModal(betId);
    // Set default winnings to 2x the bet amount
    setWinningsAmount((displayAmount * 2).toFixed(2));
  };

  const handleMarkLost = async (betId) => {
    if (isUpdating) return;

    setIsUpdating(betId);
    try {
      await betsService.settleBet(betId, 'lost', 0);
      if (onUpdate) await onUpdate();
      await fetchBets(currentPage);
    } catch (error) {
      console.error('Error marking bet as lost:', error);
      alert('Failed to mark bet as lost. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleConfirmWinnings = async () => {
    if (isUpdating || !showWinningsModal) return;

    const winnings = parseFloat(winningsAmount);
    if (isNaN(winnings) || winnings <= 0) {
      alert('Please enter a valid winnings amount');
      return;
    }

    setIsUpdating(showWinningsModal);
    try {
      await betsService.settleBet(showWinningsModal, 'won', winnings);
      if (onUpdate) await onUpdate();
      await fetchBets(currentPage);
      setShowWinningsModal(null);
      setWinningsAmount('');
    } catch (error) {
      console.error('Error marking bet as won:', error);
      alert('Failed to mark bet as won. Please try again.');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteBet = async (betId) => {
    if (window.confirm('Are you sure you want to delete this bet? This action cannot be undone.')) {
      setIsDeletingBet(betId);
      try {
        await betsService.deleteBet(betId);
        if (onUpdate) await onUpdate();
        await fetchBets(currentPage);
      } catch (error) {
        console.error('Error deleting bet:', error);
        alert('Failed to delete bet: ' + error.message);
      } finally {
        setIsDeletingBet(null);
      }
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

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'won':
        return '#22c55e';
      case 'lost':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  // Component styles
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
    fontSize: '20px',
    fontWeight: 'bold',
    color: 'white',
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

  const betCardStyles = {
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #475569',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
    position: 'relative'
  };

  const betHeaderStyles = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  };

  const betInfoStyles = {
    flex: 1
  };

  const betTitleStyles = {
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    margin: '0 0 4px 0'
  };

  const betDateStyles = {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0
  };

  const betRightStyles = {
    textAlign: 'right',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px'
  };

  const betAmountStyles = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    margin: 0
  };

  const statusBadgeStyles = {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'lowercase'
  };

  const actionButtonsStyles = {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  };

  const actionButtonBaseStyles = {
    padding: '6px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    border: 'none'
  };

  const winButtonStyles = {
    ...actionButtonBaseStyles,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    color: '#22c55e',
    border: '1px solid rgba(34, 197, 94, 0.3)'
  };

  const lostButtonStyles = {
    ...actionButtonBaseStyles,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    color: '#ef4444',
    border: '1px solid rgba(239, 68, 68, 0.3)'
  };

  const deleteButtonStyles = {
    ...actionButtonBaseStyles,
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
    color: '#64748b',
    border: '1px solid rgba(100, 116, 139, 0.3)'
  };

  const modalOverlayStyles = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  };

  const modalStyles = {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #475569',
    minWidth: '300px',
    maxWidth: '400px'
  };

  const modalTitleStyles = {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    marginBottom: '16px'
  };

  const inputStyles = {
    width: '100%',
    padding: '12px',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    border: '1px solid #475569',
    borderRadius: '6px',
    color: 'white',
    fontSize: '16px',
    marginBottom: '16px'
  };

  const modalButtonsStyles = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  };

  const modalButtonStyles = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s'
  };

  if (loading) {
    return (
      <div style={containerStyles}>
        <div style={headerStyles}>
          <div>
            <h4 style={titleStyles}>Active Betting History</h4>
            <p style={subtitleStyles}>Loading...</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#94a3b8' }}>Loading bets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyles}>
        <div style={headerStyles}>
          <div>
            <h4 style={titleStyles}>Active Betting History</h4>
            <p style={{ ...subtitleStyles, color: '#ef4444' }}>Error loading bets</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: '#ef4444', marginBottom: '16px' }}>
            Failed to load bets: {error}
          </p>
          <button
            onClick={() => fetchBets(currentPage)}
            style={{
              ...paginationButtonStyles,
              backgroundColor: currentTheme?.primary || '#a855f7'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalBets = pagination?.total || bets.length;
  const startIndex = pagination ? (currentPage - 1) * 20 + 1 : 1;
  const endIndex = pagination ? Math.min(currentPage * 20, totalBets) : bets.length;

  return (
    <div style={containerStyles}>
      {/* Header */}
      <div style={headerStyles}>
        <div>
          <h4 style={titleStyles}>Active Betting History</h4>
          <p style={subtitleStyles}>
            Showing {startIndex}-{endIndex} of {totalBets} bets
          </p>
        </div>
        
        {/* Pagination Controls */}
        {pagination && pagination.totalPages > 1 && (
          <div style={paginationStyles}>
            <button
              onClick={() => fetchBets(currentPage - 1)}
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
              Page {currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => fetchBets(currentPage + 1)}
              disabled={currentPage >= pagination.totalPages}
              style={{
                ...paginationButtonStyles,
                opacity: currentPage >= pagination.totalPages ? 0.5 : 1,
                cursor: currentPage >= pagination.totalPages ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => {
                if (currentPage < pagination.totalPages) {
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

      {/* Bet Cards */}
      {bets.length > 0 ? (
        <div>
          {bets.map((bet) => (
            <div key={bet.id} style={betCardStyles}>
              <div style={betHeaderStyles}>
                <div style={betInfoStyles}>
                  <h5 style={betTitleStyles}>
                    {bet.description || `Bet ${bet.id}`}
                  </h5>
                  <p style={betDateStyles}>
                    {formatDate(bet.betDate || bet.date)}
                  </p>
                </div>
                
                <div style={betRightStyles}>
                  <div style={betAmountStyles}>
                    {formatCurrency(bet.displayAmount || bet.amount)}
                  </div>
                  
                  <div style={{
                    ...statusBadgeStyles,
                    backgroundColor: getStatusBadgeColor(bet.status) + '20',
                    color: getStatusBadgeColor(bet.status),
                    border: `1px solid ${getStatusBadgeColor(bet.status)}40`
                  }}>
                    {bet.status}
                    {bet.status === 'won' && bet.winnings && ` (+${formatCurrency(bet.winnings)})`}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={actionButtonsStyles}>
                {bet.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleMarkWon(bet.id, bet.displayAmount || bet.amount)}
                      disabled={isUpdating === bet.id}
                      style={{
                        ...winButtonStyles,
                        opacity: isUpdating === bet.id ? 0.6 : 1
                      }}
                      onMouseOver={(e) => {
                        if (isUpdating !== bet.id) {
                          e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                      }}
                    >
                      <TrendingUp size={12} />
                      Mark Won
                    </button>
                    
                    <button
                      onClick={() => handleMarkLost(bet.id)}
                      disabled={isUpdating === bet.id}
                      style={{
                        ...lostButtonStyles,
                        opacity: isUpdating === bet.id ? 0.6 : 1
                      }}
                      onMouseOver={(e) => {
                        if (isUpdating !== bet.id) {
                          e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.3)';
                        }
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                      }}
                    >
                      <TrendingDown size={12} />
                      Mark Lost
                    </button>
                  </>
                )}
                
                <button
                  onClick={() => handleDeleteBet(bet.id)}
                  disabled={isDeletingBet === bet.id}
                  style={{
                    ...deleteButtonStyles,
                    opacity: isDeletingBet === bet.id ? 0.6 : 1
                  }}
                  onMouseOver={(e) => {
                    if (isDeletingBet !== bet.id) {
                      e.target.style.backgroundColor = 'rgba(100, 116, 139, 0.3)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(100, 116, 139, 0.2)';
                  }}
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>
            No bets recorded for this account yet.
          </p>
        </div>
      )}

      {/* Winnings Modal */}
      {showWinningsModal && (
        <div style={modalOverlayStyles} onClick={() => setShowWinningsModal(null)}>
          <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
            <h3 style={modalTitleStyles}>Enter Winnings Amount</h3>
            <input
              type="number"
              value={winningsAmount}
              onChange={(e) => setWinningsAmount(e.target.value)}
              placeholder="Enter winnings amount"
              style={inputStyles}
              step="0.01"
              min="0"
              autoFocus
            />
            <div style={modalButtonsStyles}>
              <button
                onClick={() => setShowWinningsModal(null)}
                style={{
                  ...modalButtonStyles,
                  backgroundColor: 'rgba(100, 116, 139, 0.2)',
                  color: '#64748b'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmWinnings}
                disabled={isUpdating}
                style={{
                  ...modalButtonStyles,
                  backgroundColor: '#22c55e',
                  color: 'white',
                  opacity: isUpdating ? 0.6 : 1
                }}
              >
                {isUpdating ? 'Saving...' : 'Confirm Win'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};