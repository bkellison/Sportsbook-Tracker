import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useAccounts } from '../../hooks/useAccounts';
import { useTheme } from '../../context/ThemeContext';
import { transactionsService } from '../../services/transactions.service';
import { CSVExportService } from '../../utils/csvExport';
import { styles } from '../../styles/styles';
import { Card } from '../common/Card';

export const BulkImport = () => {
  const { accounts, refreshAccounts } = useAccounts();
  const { currentTheme } = useTheme();
  const [bulkData, setBulkData] = useState('');
  const [autoBackup, setAutoBackup] = useState(() => {
    return localStorage.getItem('autoBackup') === 'true';
  });
  const [isImporting, setIsImporting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      setError('Please enter data to import');
      return;
    }

    setIsImporting(true);
    setError('');
    setSuccess('');

    try {
      const result = await transactionsService.bulkImport(bulkData);
      await refreshAccounts();
      setBulkData('');
      setSuccess(result.message || 'Data imported successfully!');
      
      // Auto backup if enabled
      if (autoBackup) {
        setTimeout(() => {
          handleExportCSV();
        }, 100);
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      setError('Error importing data. Please check the format: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetAllData = async () => {
    if (window.confirm('This will clear ALL data from ALL accounts. This action cannot be undone. Are you absolutely sure?')) {
      setIsResetting(true);
      setError('');
      setSuccess('');
      
      try {
        await transactionsService.resetAllData();
        await refreshAccounts();
        setSuccess('All data has been reset successfully.');
      } catch (error) {
        console.error('Reset error:', error);
        setError('Failed to reset data: ' + error.message);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleExportCSV = () => {
    try {
      CSVExportService.exportAccountsToCSV(accounts);
      setSuccess('Data exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data: ' + error.message);
    }
  };

  const handleImportCSV = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csvData = CSVExportService.parseCSV(e.target.result);
          setBulkData(csvData);
          setSuccess('CSV data has been loaded into the bulk import field. Please review and click "Import Data" to proceed.');
          setError('');
        } catch (error) {
          console.error('CSV parse error:', error);
          setError('Error parsing CSV data. Please check the format: ' + error.message);
          setSuccess('');
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    event.target.value = '';
  };

  const handleAutoBackupToggle = (enabled) => {
    setAutoBackup(enabled);
    localStorage.setItem('autoBackup', enabled.toString());
  };

  const dynamicStyles = {
    container: {
      maxWidth: '400px',
      margin: '0 auto'
    },
    submitButton: {
      width: '100%',
      backgroundColor: currentTheme.primary,
      color: 'white',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '16px',
      opacity: (isImporting || isResetting) ? 0.7 : 1
    },
    exportButton: {
      width: '100%',
      backgroundColor: '#16a34a',
      color: 'white',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '16px',
      marginBottom: '8px'
    },
    resetButton: {
      width: '100%',
      backgroundColor: '#dc2626',
      color: 'white',
      fontWeight: '500',
      padding: '12px 16px',
      borderRadius: '8px',
      transition: 'background-color 0.2s',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontSize: '16px',
      marginTop: '8px',
      opacity: isResetting ? 0.7 : 1
    }
  };

  return (
    <div style={dynamicStyles.container}>
      <Card>
        <h3 style={styles.sectionTitle}>Data Management</h3>
        
        {/* Success Message */}
        {success && (
          <div style={{
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid #22c55e',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#22c55e',
            fontSize: '14px'
          }}>
            {success}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#ef4444',
            fontSize: '14px',
            whiteSpace: 'pre-wrap'
          }}>
            {error}
          </div>
        )}
        
        {/* CSV Export/Import Section */}
        <div style={{ marginBottom: '32px' }}>
          <h4 style={{ ...styles.sectionTitle, fontSize: '18px', marginBottom: '16px' }}>
            CSV Export/Import
          </h4>
          
          {/* Auto-backup toggle */}
          <div style={{ ...styles.formGroup, marginBottom: '16px' }}>
            <label style={{
              ...styles.label, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => handleAutoBackupToggle(e.target.checked)}
                style={{
                  width: 'auto',
                  margin: 0,
                  accentColor: currentTheme.primary
                }}
              />
              Auto-backup after each transaction
            </label>
            <p style={{ ...styles.accountLabel, fontSize: '12px', marginTop: '4px' }}>
              When enabled, a CSV backup will automatically download after each transaction
            </p>
          </div>
          
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={handleExportCSV}
              style={dynamicStyles.exportButton}
              disabled={!accounts || Object.keys(accounts).length === 0}
            >
              Export to CSV
            </button>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Import CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              style={{
                ...styles.input,
                padding: '8px',
                backgroundColor: '#374151',
                color: 'white'
              }}
            />
            <p style={{ ...styles.accountLabel, fontSize: '12px', marginTop: '8px' }}>
              Upload a CSV file to restore your data. Make sure it follows the export format.
            </p>
          </div>
        </div>

        <hr style={{ border: '1px solid #475569', margin: '24px 0' }} />
        
        {/* Manual Bulk Import Section */}
        <h4 style={{ ...styles.sectionTitle, fontSize: '18px', marginBottom: '16px' }}>
          Manual Bulk Import
        </h4>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Paste your data (CSV format)</label>
          <p style={{ ...styles.accountLabel, marginBottom: '8px' }}>
            Format: account,type,amount,description (one per line)
          </p>
          <div style={{ ...styles.accountLabel, marginBottom: '16px', fontSize: '12px' }}>
            <strong>Account codes:</strong> draftkings1, draftkings2, fanduel, betmgm, bet365<br/>
            <strong>Types:</strong> deposit, withdrawal, bet, bonus-bet, bonus-credit, historical-win, historical-loss<br/>
            <strong>Example:</strong><br/>
            draftkings1,deposit,20,Gaming Deposit - Venmo<br/>
            draftkings1,historical-loss,25,Bet ID: 168D1CAA<br/>
            draftkings1,historical-win,64,Win ID: CB79926D<br/>
            draftkings1,bonus-credit,1,AwardUserBonusOffer<br/>
            fanduel,bet,50,Current bet - Lakers vs Warriors
          </div>
          <textarea
            value={bulkData}
            onChange={(e) => {
              setBulkData(e.target.value);
              setError('');
              setSuccess('');
            }}
            style={{
              ...styles.input,
              height: '200px',
              resize: 'vertical',
              fontFamily: 'monospace'
            }}
            placeholder="draftkings1,deposit,100,Initial deposit&#10;draftkings1,bet,25,Lakers vs Warriors&#10;draftkings1,bonus-bet,25,Free bet promo&#10;fanduel,deposit,50,Welcome bonus"
          />
        </div>

        <button
          type="button"
          onClick={handleBulkImport}
          style={dynamicStyles.submitButton}
          disabled={isImporting || isResetting}
        >
          <Plus size={16} />
          {isImporting ? 'Importing...' : 'Import Data'}
        </button>

        <div style={{marginTop: '16px'}}>
          <button
            type="button"
            onClick={handleResetAllData}
            style={dynamicStyles.resetButton}
            disabled={isImporting || isResetting}
          >
            {isResetting ? 'Resetting...' : 'Reset All Data'}
          </button>
        </div>
      </Card>
    </div>
  );
};