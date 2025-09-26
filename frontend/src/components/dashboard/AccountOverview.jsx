import React from 'react';
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const AccountOverview = ({ accounts }) => {
  if (!accounts || Object.keys(accounts).length === 0) {
    return (
      <Card>
        <h3 style={styles.sectionTitle}>Account Overview</h3>
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#94a3b8'
        }}>
          <Activity size={48} color="#94a3b8" style={{ margin: '0 auto 16px' }} />
          <p>No accounts with data available yet.</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Add some transactions to see your account overview.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={styles.sectionTitle}>Account Overview</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0 0' }}>
          Performance breakdown by betting account
        </p>
      </div>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '24px'
      }}>
        {Object.entries(accounts).map(([key, account]) => {
          // Calculate account-specific metrics
          const accountBetNetProfit = (account.bets || [])
            .filter(bet => bet.status === 'won')
            .reduce((sum, bet) => sum + ((bet.winnings || 0) - bet.amount), 0);
          
          const accountBetLosses = (account.bets || [])
            .filter(bet => bet.status === 'lost')
            .reduce((sum, bet) => sum + bet.amount, 0);
          
          const accountHistoricalWins = (account.transactions || [])
            .filter(t => t.type === 'historical-win')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const accountHistoricalLosses = (account.transactions || [])
            .filter(t => t.type === 'historical-loss')
            .reduce((sum, t) => sum + t.amount, 0);
          
          const accountBonusCredits = key === 'fanduel' ? 
            (account.transactions || [])
              .filter(t => t.type === 'bonus-credit')
              .reduce((sum, t) => sum + t.amount, 0) : 0;
          
          const hasBettingActivity = (account.bets || []).length > 0 || 
                                    (account.transactions || []).some(t => ['historical-win', 'historical-loss'].includes(t.type));
          
          let surplusProfit = 0;
          let adjustedBalance = account.balance || 0;
          
          if (!hasBettingActivity) {
            const withdrawalSurplus = (account.totalWithdrawals || 0) - (account.totalDeposits || 0);
            if (withdrawalSurplus > 0) {
              surplusProfit = withdrawalSurplus;
              adjustedBalance = 0;
            }
          }
          
          const accountNetPL = (accountBetNetProfit + accountHistoricalWins + accountBonusCredits + surplusProfit) - 
                              (accountBetLosses + accountHistoricalLosses);

          // Calculate additional metrics
          const totalBets = (account.bets || []).length;
          const activeBets = (account.bets || []).filter(bet => bet.status === 'pending').length;
          const totalTransactions = (account.transactions || []).length;

          return (
            <div key={key} style={{
              ...styles.accountCard,
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Account header with improved styling */}
              <div style={{
                ...styles.accountHeader,
                paddingBottom: '16px',
                borderBottom: '1px solid #475569',
                marginBottom: '16px'
              }}>
                <div>
                  <h4 style={{
                    ...styles.accountName,
                    marginBottom: '4px'
                  }}>
                    {account.name}
                  </h4>
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    <span>{totalBets} bets</span>
                    <span>{totalTransactions} transactions</span>
                    {activeBets > 0 && (
                      <span style={{ color: '#facc15' }}>{activeBets} pending</span>
                    )}
                  </div>
                </div>
                <div style={{
                  padding: '8px',
                  borderRadius: '8px',
                  backgroundColor: accountNetPL >= 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'
                }}>
                  {accountNetPL >= 0 ? 
                    <TrendingUp size={20} color="#4ade80" /> : 
                    <TrendingDown size={20} color="#f87171" />
                  }
                </div>
              </div>

              {/* Account metrics grid */}
              <div style={{
                ...styles.accountGrid,
                gap: '16px'
              }}>
                <div>
                  <p style={styles.accountLabel}>Balance</p>
                  <p style={{
                    ...styles.accountValue,
                    fontSize: '18px',
                    fontWeight: 'bold'
                  }}>
                    ${adjustedBalance.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={styles.accountLabel}>Net P&L</p>
                  <p style={{ 
                    ...styles.accountValue,
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: accountNetPL >= 0 ? '#4ade80' : '#f87171' 
                  }}>
                    ${accountNetPL.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={styles.accountLabel}>Deposits</p>
                  <p style={{ 
                    ...styles.accountValue, 
                    color: '#60a5fa',
                    fontWeight: '600'
                  }}>
                    ${(account.totalDeposits || 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p style={styles.accountLabel}>Withdrawals</p>
                  <p style={{ 
                    ...styles.accountValue, 
                    color: '#facc15',
                    fontWeight: '600'
                  }}>
                    ${(account.totalWithdrawals || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Additional metrics row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #475569'
              }}>
                <div>
                  <p style={styles.accountLabel}>Win Rate</p>
                  <p style={{ 
                    ...styles.accountValue,
                    color: (() => {
                      const accountBets = (account.bets || []).filter(bet => bet.status !== 'pending');
                      if (accountBets.length === 0) return '#94a3b8';
                      const winRate = (accountBets.filter(bet => bet.status === 'won').length / accountBets.length) * 100;
                      return winRate >= 55 ? '#4ade80' : winRate >= 50 ? '#facc15' : '#f87171';
                    })()
                  }}>
                    {(() => {
                      const accountBets = (account.bets || []).filter(bet => bet.status !== 'pending');
                      if (accountBets.length === 0) return 'N/A';
                      const winRate = (accountBets.filter(bet => bet.status === 'won').length / accountBets.length) * 100;
                      return `${winRate.toFixed(1)}%`;
                    })()}
                  </p>
                </div>
                <div>
                  <p style={styles.accountLabel}>ROI</p>
                  <p style={{ 
                    ...styles.accountValue,
                    color: (() => {
                      const totalWagered = (account.bets || []).reduce((sum, bet) => sum + bet.amount, 0) +
                                         (account.transactions || []).filter(t => t.type === 'historical-loss').reduce((sum, t) => sum + t.amount, 0);
                      if (totalWagered === 0) return '#94a3b8';
                      const roi = (accountNetPL / totalWagered) * 100;
                      return roi >= 0 ? '#4ade80' : '#f87171';
                    })()
                  }}>
                    {(() => {
                      const totalWagered = (account.bets || []).reduce((sum, bet) => sum + bet.amount, 0) +
                                         (account.transactions || []).filter(t => t.type === 'historical-loss').reduce((sum, t) => sum + t.amount, 0);
                      if (totalWagered === 0) return 'N/A';
                      const roi = (accountNetPL / totalWagered) * 100;
                      return `${roi.toFixed(1)}%`;
                    })()}
                  </p>
                </div>
              </div>

              {/* Progress indicator for P&L */}
              {accountNetPL !== 0 && (account.totalDeposits || 0) > 0 && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid #475569'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      fontSize: '12px',
                      color: '#94a3b8'
                    }}>
                      Portfolio Return
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: accountNetPL >= 0 ? '#4ade80' : '#f87171',
                      fontWeight: '600'
                    }}>
                      {accountNetPL >= 0 ? '+' : ''}
                      {((accountNetPL / Math.max(account.totalDeposits || 1, 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: '#374151',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${Math.min(Math.abs((accountNetPL / Math.max(account.totalDeposits || 1, 1)) * 100), 100)}%`,
                      height: '100%',
                      backgroundColor: accountNetPL >= 0 ? '#4ade80' : '#f87171',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease',
                      boxShadow: `0 0 8px ${accountNetPL >= 0 ? '#4ade8040' : '#f8717140'}`
                    }} />
                  </div>
                </div>
              )}

              {/* Recent activity indicator */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: '#6b7280'
              }}>
                <span>
                  Last activity: {(() => {
                    const allDates = [
                      ...(account.bets || []).map(bet => new Date(bet.date)),
                      ...(account.transactions || []).map(t => new Date(t.date))
                    ].filter(date => !isNaN(date));
                    
                    if (allDates.length === 0) return 'Never';
                    
                    const mostRecent = new Date(Math.max(...allDates));
                    const daysDiff = Math.floor((new Date() - mostRecent) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff === 0) return 'Today';
                    if (daysDiff === 1) return 'Yesterday';
                    if (daysDiff < 7) return `${daysDiff} days ago`;
                    if (daysDiff < 30) return `${Math.floor(daysDiff / 7)} weeks ago`;
                    return `${Math.floor(daysDiff / 30)} months ago`;
                  })()}
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {activeBets > 0 && (
                    <span style={{
                      fontSize: '10px',
                      color: '#facc15',
                      backgroundColor: 'rgba(250, 204, 21, 0.2)',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {activeBets} pending
                    </span>
                  )}
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: (() => {
                      if (activeBets > 0) return '#facc15';
                      if (totalBets > 0) return '#4ade80';
                      if ((account.totalDeposits || 0) > 0) return '#60a5fa';
                      return '#94a3b8';
                    })()
                  }} />
                </div>
              </div>

              {/* Account health indicator */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: (() => {
                    if (accountNetPL > 100) return '#4ade80';
                    if (accountNetPL > 0) return '#facc15';
                    if (accountNetPL < -100) return '#ef4444';
                    if (accountNetPL < 0) return '#f87171';
                    return '#94a3b8';
                  })(),
                  boxShadow: `0 0 8px ${(() => {
                    if (accountNetPL > 100) return '#4ade8060';
                    if (accountNetPL > 0) return '#facc1560';
                    if (accountNetPL < -100) return '#ef444460';
                    if (accountNetPL < 0) return '#f8717160';
                    return '#94a3b860';
                  })()}`,
                  animation: activeBets > 0 ? 'pulse 2s infinite' : 'none'
                }} />
                {activeBets > 0 && (
                  <div style={{
                    fontSize: '8px',
                    color: '#facc15',
                    fontWeight: 'bold',
                    textAlign: 'center'
                  }}>
                    {activeBets}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Summary footer with more detailed statistics */}
      <div style={{
        marginTop: '32px',
        paddingTop: '24px',
        borderTop: '2px solid #475569'
      }}>
        <h4 style={{
          ...styles.sectionTitle,
          fontSize: '16px',
          marginBottom: '20px',
          color: '#e2e8f0'
        }}>
          Portfolio Summary
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '20px',
          backgroundColor: 'rgba(51, 65, 85, 0.4)',
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid #475569'
        }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Accounts
            </p>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: 'white', 
              margin: 0,
              lineHeight: 1
            }}>
              {Object.keys(accounts).length}
            </p>
            <p style={{
              fontSize: '10px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              betting platforms
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Active Accounts
            </p>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#4ade80', 
              margin: 0,
              lineHeight: 1
            }}>
              {Object.values(accounts).filter(account => 
                (account.balance || 0) > 0 || 
                (account.bets || []).some(bet => bet.status === 'pending')
              ).length}
            </p>
            <p style={{
              fontSize: '10px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              with activity
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Pending Bets
            </p>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#facc15', 
              margin: 0,
              lineHeight: 1
            }}>
              {Object.values(accounts).reduce((sum, account) => 
                sum + (account.bets || []).filter(bet => bet.status === 'pending').length, 0
              )}
            </p>
            <p style={{
              fontSize: '10px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              awaiting results
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              This Month
            </p>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#c4b5fd', 
              margin: 0,
              lineHeight: 1
            }}>
              {Object.values(accounts).reduce((sum, account) => {
                const thisMonth = new Date().getMonth();
                const thisYear = new Date().getFullYear();
                return sum + (account.bets || []).filter(bet => {
                  const betDate = new Date(bet.date);
                  return betDate.getMonth() === thisMonth && betDate.getFullYear() === thisYear;
                }).length;
              }, 0)}
            </p>
            <p style={{
              fontSize: '10px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              bets placed
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Best Performer
            </p>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#10b981', 
              margin: 0,
              lineHeight: 1
            }}>
              {(() => {
                let bestAccount = null;
                let bestPL = -Infinity;
                
                Object.entries(accounts).forEach(([key, account]) => {
                  const accountBetNetProfit = (account.bets || [])
                    .filter(bet => bet.status === 'won')
                    .reduce((sum, bet) => sum + ((bet.winnings || 0) - bet.amount), 0);
                  
                  const accountBetLosses = (account.bets || [])
                    .filter(bet => bet.status === 'lost')
                    .reduce((sum, bet) => sum + bet.amount, 0);
                  
                  const accountHistoricalWins = (account.transactions || [])
                    .filter(t => t.type === 'historical-win')
                    .reduce((sum, t) => sum + t.amount, 0);
                  
                  const accountHistoricalLosses = (account.transactions || [])
                    .filter(t => t.type === 'historical-loss')
                    .reduce((sum, t) => sum + t.amount, 0);
                  
                  const accountBonusCredits = key === 'fanduel' ? 
                    (account.transactions || [])
                      .filter(t => t.type === 'bonus-credit')
                      .reduce((sum, t) => sum + t.amount, 0) : 0;
                  
                  const hasBettingActivity = (account.bets || []).length > 0 || 
                                            (account.transactions || []).some(t => ['historical-win', 'historical-loss'].includes(t.type));
                  
                  let surplusProfit = 0;
                  if (!hasBettingActivity) {
                    const withdrawalSurplus = (account.totalWithdrawals || 0) - (account.totalDeposits || 0);
                    if (withdrawalSurplus > 0) {
                      surplusProfit = withdrawalSurplus;
                    }
                  }
                  
                  const accountNetPL = (accountBetNetProfit + accountHistoricalWins + accountBonusCredits + surplusProfit) - 
                                      (accountBetLosses + accountHistoricalLosses);
                  
                  if (accountNetPL > bestPL) {
                    bestPL = accountNetPL;
                    bestAccount = account.name;
                  }
                });
                
                return bestAccount ? bestAccount.split(' ')[0] : 'None';
              })()}
            </p>
            <p style={{
              fontSize: '10px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              by profit
            </p>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '12px', 
              color: '#94a3b8', 
              marginBottom: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Avg Balance
            </p>
            <p style={{ 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#60a5fa', 
              margin: 0,
              lineHeight: 1
            }}>
              ${Object.keys(accounts).length > 0 ? 
                (Object.values(accounts).reduce((sum, account) => sum + (account.balance || 0), 0) / Object.keys(accounts).length).toFixed(0) : 
                '0'}
            </p>
            <p style={{
              fontSize: '10px',
              color: '#6b7280',
              marginTop: '4px'
            }}>
              per account
            </p>
          </div>
        </div>
      </div>

      {/* Add pulse animation for active bets */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.7;
              transform: scale(1.1);
            }
          }
        `}
      </style>
    </Card>
  );
};