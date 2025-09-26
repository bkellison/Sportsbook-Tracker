import React from 'react';
import { DollarSign, Activity, TrendingUp, TrendingDown, Target, Award } from 'lucide-react';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const QuickStats = ({ totals }) => {
  const statsData = [
    {
      title: 'Total Bets',
      value: totals.totalBetsPlaced,
      subtitle: `${totals.totalBetsWon}W - ${totals.totalBetsLost}L`,
      icon: Target,
      iconColor: '#a78bfa',
      description: 'All bets placed'
    },
    {
      title: 'Avg Bet Size',
      value: `$${totals.avgBetSize.toFixed(2)}`,
      icon: DollarSign,
      iconColor: '#60a5fa',
      description: 'Average amount per bet'
    },
    {
      title: 'Current Streak',
      value: totals.currentStreak === 0 ? 'None' : 
             totals.currentStreak > 0 ? `${totals.currentStreak}W` : 
             `${Math.abs(totals.currentStreak)}L`,
      icon: totals.currentStreak > 0 ? TrendingUp : 
            totals.currentStreak < 0 ? TrendingDown : Activity,
      iconColor: totals.currentStreak > 0 ? '#4ade80' : 
                 totals.currentStreak < 0 ? '#f87171' : '#a78bfa',
      valueStyle: totals.currentStreak > 0 ? styles.cardValueGreen : 
                  totals.currentStreak < 0 ? styles.cardValueRed : styles.cardValue,
      description: 'Current winning or losing streak'
    },
    {
      title: 'Profit Factor',
      value: totals.profitFactor === 999 ? '∞' : totals.profitFactor.toFixed(2),
      icon: Award,
      iconColor: totals.profitFactor >= 1.5 ? '#4ade80' : 
                 totals.profitFactor >= 1 ? '#facc15' : '#f87171',
      valueStyle: totals.profitFactor >= 1.5 ? styles.cardValueGreen : 
                  totals.profitFactor >= 1 ? styles.cardValueYellow : styles.cardValueRed,
      description: 'Ratio of total wins to total losses'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginBottom: '24px'
    }}>
      {statsData.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <Card key={index} className="quick-stat-card">
            <div style={styles.cardHeader}>
              <div style={{ flex: 1 }}>
                <p style={styles.cardTitle}>{stat.title}</p>
                <p style={stat.valueStyle || styles.cardValue}>{stat.value}</p>
                {stat.subtitle && (
                  <p style={{ 
                    ...styles.cardTitle, 
                    fontSize: '12px', 
                    margin: '4px 0 0 0',
                    color: '#94a3b8'
                  }}>
                    {stat.subtitle}
                  </p>
                )}
                {stat.description && (
                  <p style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    margin: '2px 0 0 0',
                    fontStyle: 'italic'
                  }}>
                    {stat.description}
                  </p>
                )}
              </div>
              <div style={{
                padding: '10px',
                borderRadius: '10px',
                backgroundColor: stat.iconColor + '20'
              }}>
                <IconComponent size={28} color={stat.iconColor} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};