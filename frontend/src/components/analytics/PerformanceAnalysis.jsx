import React from 'react';
import { Activity, DollarSign } from 'lucide-react';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const PerformanceAnalysis = ({ totals }) => {
  return (
    <Card>
      <h3 style={styles.sectionTitle}>Performance Analysis</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px'
      }}>
        <div style={styles.accountCard}>
          <div style={styles.accountHeader}>
            <h4 style={styles.accountName}>Efficiency Metrics</h4>
            <Activity size={20} color="#a78bfa" />
          </div>
          <div style={styles.accountGrid}>
            <div>
              <p style={styles.accountLabel}>Return on Investment</p>
              <p style={{ 
                ...styles.accountValue, 
                color: totals.roi >= 0 ? '#4ade80' : '#f87171' 
              }}>
                {totals.roi.toFixed(2)}%
              </p>
            </div>
            <div>
              <p style={styles.accountLabel}>Profit Factor</p>
              <p style={{ 
                ...styles.accountValue, 
                color: totals.profitFactor >= 1.5 ? '#4ade80' : 
                       totals.profitFactor >= 1 ? '#facc15' : '#f87171' 
              }}>
                {totals.profitFactor === 999 ? '∞' : totals.profitFactor.toFixed(2)}
              </p>
            </div>
            <div>
              <p style={styles.accountLabel}>Win Rate</p>
              <p style={{ 
                ...styles.accountValue, 
                color: totals.winRate >= 55 ? '#4ade80' : 
                       totals.winRate >= 50 ? '#facc15' : '#f87171' 
              }}>
                {totals.winRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p style={styles.accountLabel}>Risk Assessment</p>
              <p style={{ 
                ...styles.accountValue, 
                color: totals.roi > 5 && totals.winRate > 52 ? '#4ade80' : 
                       totals.roi > 0 ? '#facc15' : '#f87171' 
              }}>
                {totals.roi > 5 && totals.winRate > 52 ? 'Excellent' : 
                 totals.roi > 0 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>
          </div>
        </div>

        <div style={styles.accountCard}>
          <div style={styles.accountHeader}>
            <h4 style={styles.accountName}>Bankroll Management</h4>
            <DollarSign size={20} color="#60a5fa" />
          </div>
          <div style={styles.accountGrid}>
            <div>
              <p style={styles.accountLabel}>Total Invested</p>
              <p style={{ ...styles.accountValue, color: '#60a5fa' }}>
                ${totals.totalDeposits.toFixed(2)}
              </p>
            </div>
            <div>
              <p style={styles.accountLabel}>Total Withdrawn</p>
              <p style={{ ...styles.accountValue, color: '#facc15' }}>
                ${totals.totalWithdrawals.toFixed(2)}
              </p>
            </div>
            <div>
              <p style={styles.accountLabel}>Net Investment</p>
              <p style={{ 
                ...styles.accountValue, 
                color: (totals.totalWithdrawals - totals.totalDeposits) >= 0 ? '#4ade80' : '#f87171' 
              }}>
                ${Math.abs(totals.totalWithdrawals - totals.totalDeposits).toFixed(2)}
              </p>
            </div>
            <div>
              <p style={styles.accountLabel}>Portfolio ROI</p>
              <p style={{ 
                ...styles.accountValue, 
                color: totals.totalDeposits > 0 ? 
                       (totals.netPL / totals.totalDeposits * 100 >= 0 ? '#4ade80' : '#f87171') : 
                       '#94a3b8' 
              }}>
                {totals.totalDeposits > 0 ? 
                 (totals.netPL / totals.totalDeposits * 100).toFixed(2) + '%' : 
                 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};