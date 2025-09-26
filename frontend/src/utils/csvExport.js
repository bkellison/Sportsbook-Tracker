export class CSVExportService {
  static exportAccountsToCSV(accounts, filename = null) {
    let csvContent = "Account,Type,Amount,Description,Date,Status,Winnings,IsBonusBet\n";
    
    Object.entries(accounts).forEach(([accountKey, account]) => {
      // Export transactions
      if (account.transactions) {
        account.transactions.forEach(transaction => {
          csvContent += `${accountKey},${transaction.type},${transaction.amount},"${this.escapeCsvField(transaction.description || '')}",${transaction.date},completed,0,false\n`;
        });
      }
      
      // Export bets
      if (account.bets) {
        account.bets.forEach(bet => {
          csvContent += `${accountKey},bet,${bet.amount},"${this.escapeCsvField(bet.description || '')}",${bet.date},${bet.status},${bet.winnings || 0},${bet.isBonusBet || false}\n`;
        });
      }
    });

    this.downloadCSV(csvContent, filename || `sportsbook_data_${new Date().toISOString().split('T')[0]}.csv`);
  }

  static downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static parseCSV(csvText) {
    try {
      const lines = csvText.trim().split('\n').slice(1); // Skip header
      return lines.map(line => {
        const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (parts && parts.length >= 4) {
          const [accountKey, type, amount, description] = parts.map(p => p.replace(/"/g, '').trim());
          return `${accountKey},${type},${amount},${description}`;
        }
        return null;
      }).filter(Boolean).join('\n');
    } catch (error) {
      throw new Error('Error parsing CSV data. Please check the format.');
    }
  }

  static validateCSVData(csvData) {
    const lines = csvData.trim().split('\n');
    const errors = [];
    
    lines.forEach((line, index) => {
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length < 3) {
        errors.push(`Line ${index + 1}: Not enough columns (need at least 3)`);
        return;
      }
      
      const [account, type, amount] = parts;
      
      if (!account) {
        errors.push(`Line ${index + 1}: Missing account`);
      }
      
      if (!type) {
        errors.push(`Line ${index + 1}: Missing transaction type`);
      }
      
      if (!amount || isNaN(parseFloat(amount))) {
        errors.push(`Line ${index + 1}: Invalid amount`);
      }
    });
    
    return errors;
  }

  static escapeCsvField(field) {
    if (typeof field !== 'string') return '';
    return field.replace(/"/g, '""');
  }

  static formatCsvDate(date) {
    if (!date) return new Date().toISOString().split('T')[0];
    return new Date(date).toISOString().split('T')[0];
  }
}
