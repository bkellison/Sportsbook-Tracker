import React from 'react';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const AdvancedMetrics = ({ totals }) => {
  const metricsData = [
    {
      title: 'Total Wagered',
      value: `${totals.totalAmountWagered.toFixed(2)}`,
      icon: DollarSign,
      iconColor: '#a78bfa'
    },
    {
      title: 'Average Win',
      value: `${totals.avgWin.toFixed(2)}`,
      icon: TrendingUp,
      iconColor: '#4ade80',
      valueStyle: styles.cardValueGreen
    },
    {
      title: 'Average Loss',
      value: `${totals.avgLoss.toFixed(2)}`,
      icon: TrendingDown,
      iconColor: '#f87171',
      valueStyle: styles.cardValueRed
    },
    {
      title: 'Biggest Win',
      value: `${totals.biggestWin.toFixed(2)}`,
      icon: TrendingUp,
      iconColor: '#4ade80',
      valueStyle: styles.cardValueGreen
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '24px',
      marginBottom: '24px'
    }}>
      {metricsData.map((metric, index) => {
        const IconComponent = metric.icon;
        return (
          <Card key={index}>
            <div style={styles.cardHeader}>
              <div>
                <p style={styles.cardTitle}>{metric.title}</p>
                <p style={metric.valueStyle || styles.cardValue}>{metric.value}</p>
              </div>
              <IconComponent size={32} color={metric.iconColor} />
            </div>
          </Card>
        );
      })}
    </div>
  );
};
