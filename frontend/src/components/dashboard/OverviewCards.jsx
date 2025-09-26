import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const OverviewCards = ({ totals }) => {
  const { currentTheme } = useTheme();

  const cardData = [
    {
      title: 'Total Balance',
      value: `$${totals.totalBalance.toFixed(2)}`,
      icon: DollarSign,
      iconColor: '#a78bfa',
      valueStyle: styles.cardValue,
      description: 'Current balance across all accounts'
    },
    {
      title: 'Total Deposits',
      value: `$${totals.totalDeposits.toFixed(2)}`,
      icon: TrendingUp,
      iconColor: '#60a5fa',
      valueStyle: styles.cardValueBlue,
      description: 'Total money deposited'
    },
    {
      title: 'Total Withdrawals',
      value: `$${totals.totalWithdrawals.toFixed(2)}`,
      icon: TrendingDown,
      iconColor: '#facc15',
      valueStyle: styles.cardValueYellow,
      description: 'Total money withdrawn'
    },
    {
      title: 'Net P&L',
      value: `$${totals.netPL.toFixed(2)}`,
      icon: totals.netPL >= 0 ? TrendingUp : TrendingDown,
      iconColor: totals.netPL >= 0 ? '#4ade80' : '#f87171',
      valueStyle: totals.netPL >= 0 ? styles.cardValueGreen : styles.cardValueRed,
      description: 'Total profit or loss'
    },
    {
      title: 'Win Rate',
      value: `${totals.winRate.toFixed(1)}%`,
      icon: Activity,
      iconColor: totals.winRate >= 55 ? '#4ade80' : totals.winRate >= 50 ? '#facc15' : '#f87171',
      valueStyle: totals.winRate >= 55 ? styles.cardValueGreen : totals.winRate >= 50 ? styles.cardValueYellow : styles.cardValueRed,
      description: 'Percentage of bets won'
    },
    {
      title: 'ROI',
      value: `${totals.roi.toFixed(1)}%`,
      icon: totals.roi >= 0 ? TrendingUp : TrendingDown,
      iconColor: totals.roi >= 0 ? '#4ade80' : '#f87171',
      valueStyle: totals.roi >= 0 ? styles.cardValueGreen : styles.cardValueRed,
      description: 'Return on investment'
    }
  ];

  return (
    <div style={{ 
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '24px',
      marginBottom: '24px'
    }}>
      {cardData.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className="overview-card">
            <div style={styles.cardHeader}>
              <div style={{ flex: 1 }}>
                <p style={styles.cardTitle}>{card.title}</p>
                <p style={card.valueStyle}>{card.value}</p>
                {card.description && (
                  <p style={{
                    fontSize: '12px',
                    color: '#94a3b8',
                    margin: '4px 0 0 0',
                    fontStyle: 'italic'
                  }}>
                    {card.description}
                  </p>
                )}
              </div>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: card.iconColor + '20'
              }}>
                <IconComponent size={32} color={card.iconColor} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};