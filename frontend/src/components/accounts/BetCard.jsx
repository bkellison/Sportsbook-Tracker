import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { styles } from '../../styles/styles';
import { useTheme } from '../../context/ThemeContext';
import { FormattersService } from '../../utils/formatters';

export const BetCard = ({ bet, onUpdate, onDelete }) => {
  const { currentTheme } = useTheme();
  const [showActions, setShowActions] = useState(false);
  const [settlingBet, setSettlingBet] = useState(false);

  const handleMarkWon = async () => {
    const winnings = prompt('Enter total payout amount (including your original wager):');
    if (winnings && !isNaN(winnings) && parseFloat(winnings) > 0) {
      setSettlingBet(true);
      try {
        await onUpdate({
          status: 'won',
          winnings: parseFloat(winnings)
        });
      } catch (error) {
        console.error('Error marking bet as won:', error);
        alert('Failed to mark bet as won');
      } finally {
        setSettlingBet(false);
      }
    }
  };

  const handleMarkLost = async () => {
    if (window.confirm('Are you sure you want to mark this bet as lost?')) {
      setSettlingBet(true);
      try {
        await onUpdate({
          status: 'lost',
          winnings: 0
        });
      } catch (error) {
        console.error('Error marking bet as lost:', error);
        alert('Failed to mark bet as lost');
      } finally {
        setSettlingBet(false);
      }
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this bet? This action cannot be undone.')) {
      try {
        await onDelete();
      } catch (error) {
        console.error('Error deleting bet:', error);
        alert('Failed to delete bet');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'won':
        return '#10b981';
      case 'lost':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'won':
        return TrendingUp;
      case 'lost':
        return TrendingDown;
      case 'pending':
        return Clock;
      default:
        return DollarSign;
    }
  };

  const calculateProfitLoss = () => {
    if (bet.status === 'won' && bet.winnings) {
      return bet.winnings - (bet.displayAmount || bet.amount);
    } else if (bet.status === 'lost') {
      return -(bet.displayAmount || bet.amount);
    }
    return 0;
  };

  const profitLoss = calculateProfitLoss();
  const StatusIcon = getStatusIcon(bet.status);
  const statusColor = getStatusColor(bet.status);

  const cardStyle = {
    ...styles.betCard,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative'
  };

  const cardHoverStyle = {
    backgroundColor: 'rgba(51, 65, 85, 0.7)',
    borderColor: currentTheme.primary + '40'
  };

  return (
    <div
      style={showActions ? { ...cardStyle, ...cardHoverStyle } : cardStyle}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Main bet info */}
      <div style={styles.betHeader}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <StatusIcon size={16} color={statusColor} />
            <h4 style={styles.betDescription}>
              {bet.description || 'Bet'}
            </h4>
            {bet.isBonusBet && (
              <span style={{
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                color: '#fbbf24',
                fontSize: '10px',
                fontWeight: '600',
                padding: '2px 6px',
                borderRadius: '4px',
                textTransform: 'uppercase'
              }}>
                Bonus
              </span>
            )}
          </div>
          <p style={styles.betDate}>
            {FormattersService.formatDate(bet.betDate || bet.date)}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={styles.betAmount}>
            {FormattersService.formatCurrency(bet.displayAmount || bet.amount)}
            {bet.isBonusBet && (
              <span style={{
                color: '#94a3b8',
                fontSize: '10px',
                display: 'block',
                fontWeight: 'normal'
              }}>
                No Risk
              </span>
            )}
          </p>
          
          {/* Status badge */}
          <span style={{
            ...styles.statusBadge,
            backgroundColor: statusColor + '20',
            color: statusColor,
            border: `1px solid ${statusColor}30`
          }}>
            {bet.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Profit/Loss indicator for settled bets */}
      {bet.status !== 'pending' && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: 'rgba(51, 65, 85, 0.3)',
          borderRadius: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {bet.status === 'won' ? 'Profit/Loss:' : 'Loss:'}
          </span>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: profitLoss >= 0 ? '#10b981' : '#ef4444'
          }}>
            {profitLoss >= 0 ? '+' : ''}{FormattersService.formatCurrency(profitLoss)}
          </span>
        </div>
      )}

      {/* Winnings display for won bets */}
      {bet.status === 'won' && bet.winnings && (
        <div style={{
          marginTop: '8px',
          padding: '6px 8px',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#10b981'
        }}>
          Total Payout: {FormattersService.formatCurrency(bet.winnings)}
        </div>
      )}

      {/* Action buttons for pending bets */}
      {bet.status === 'pending' && showActions && (
        <div style={{
          ...styles.buttonGroup,
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          opacity: showActions ? 1 : 0,
          transition: 'opacity 0.2s ease'
        }}>
          <button
            onClick={handleMarkWon}
            disabled={settlingBet}
            style={{
              ...styles.smallButton,
              ...styles.winButton,
              opacity: settlingBet ? 0.6 : 1
            }}
          >
            {settlingBet ? 'Processing...' : 'Won'}
          </button>
          <button
            onClick={handleMarkLost}
            disabled={settlingBet}
            style={{
              ...styles.smallButton,
              ...styles.loseButton,
              opacity: settlingBet ? 0.6 : 1
            }}
          >
            {settlingBet ? 'Processing...' : 'Lost'}
          </button>
          <button
            onClick={handleDelete}
            disabled={settlingBet}
            style={{
              ...styles.smallButton,
              backgroundColor: '#64748b',
              color: 'white',
              opacity: settlingBet ? 0.6 : 1
            }}
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete button for settled bets */}
      {bet.status !== 'pending' && showActions && (
        <button
          onClick={handleDelete}
          style={{
            ...styles.smallButton,
            backgroundColor: '#64748b',
            color: 'white',
            position: 'absolute',
            top: '12px',
            right: '12px',
            opacity: showActions ? 1 : 0,
            transition: 'opacity 0.2s ease'
          }}
        >
          Delete
        </button>
      )}

      {settlingBet && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          Processing...
        </div>
      )}
    </div>
  );
};