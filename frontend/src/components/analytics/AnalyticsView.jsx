import React from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { AdvancedMetrics } from './AdvancedMetrics';
import { PerformanceAnalysis } from './PerformanceAnalysis';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { CalculationsService } from '../../utils/calculations';

export const AnalyticsView = () => {
  const { accounts, isLoading, error } = useAccounts();

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
        Error loading analytics: {error}
      </div>
    );
  }

  const totals = CalculationsService.getTotals(accounts);

  return (
    <div>
      {/* Advanced Metrics Cards */}
      <AdvancedMetrics totals={totals} />
      
      {/* Performance Analysis */}
      <PerformanceAnalysis totals={totals} />
    </div>
  );
};