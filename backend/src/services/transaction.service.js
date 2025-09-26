const TransactionModel = require('../models/Transaction.model');
const AccountModel = require('../models/Account.model');
const BetModel = require('../models/Bet.model');
const { AppError } = require('../middleware/error.middleware');

class TransactionService {
  /**
   * Create a new transaction
   */
  async createTransaction(userId, transactionData) {
    try {
      const { account, type, amount, description } = transactionData;
      
      // Find and validate account
      const accountData = await AccountModel.findByUserAndKey(userId, account);
      if (!accountData) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      // Validate transaction type
      if (!TransactionModel.validTypes.includes(type)) {
        throw new AppError(`Invalid transaction type: ${type}`, 400, 'INVALID_TRANSACTION_TYPE');
      }
      
      // Validate amount
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        throw new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT');
      }
      
      // Additional validations based on transaction type
      await this.validateTransactionConstraints(accountData, type, numAmount);
      
      // Create the transaction
      const transaction = await TransactionModel.create({
        account_id: accountData.id,
        type,
        amount: numAmount,
        description: description || '',
        transaction_date: new Date()
      });
      
      // Update account balance based on transaction type
      const balanceChange = this.calculateBalanceImpact(type, numAmount);
      let depositChange = 0;
      let withdrawalChange = 0;
      
      if (type === 'deposit') {
        depositChange = numAmount;
      } else if (type === 'withdrawal') {
        withdrawalChange = numAmount;
      }
      
      // Handle special case for bet transactions
      if (type === 'bet') {
        const isBonusBet = description && description.toLowerCase().includes('bonus');
        const betAmount = isBonusBet ? 0 : numAmount;
        
        // Create corresponding bet record
        await BetModel.create({
          account_id: accountData.id,
          amount: betAmount,
          display_amount: numAmount,
          description: description || '',
          bet_date: new Date(),
          is_bonus_bet: isBonusBet,
          status: 'pending'
        });
        
        // Adjust balance change for bonus bets
        if (isBonusBet) {
          balanceChange = 0; // No balance impact for bonus bets
        }
      }
      
      // Update account totals
      await AccountModel.updateTotals(accountData.id, depositChange, withdrawalChange, balanceChange);
      
      return {
        success: true,
        transaction: await TransactionModel.findById(transaction.id),
        message: 'Transaction created successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create transaction', 500, 'TRANSACTION_CREATION_FAILED');
    }
  }
  
  /**
   * Get all transactions for a user with filtering and pagination
   */
  async getUserTransactions(userId, options = {}) {
    try {
      const result = await TransactionModel.findByUserId(userId, options);
      
      // Enhance transactions with additional context
      const enhancedTransactions = result.transactions.map(transaction => ({
        ...transaction,
        impact: this.getTransactionImpact(transaction),
        category: this.categorizeTransaction(transaction)
      }));
      
      return {
        success: true,
        transactions: enhancedTransactions,
        pagination: result.pagination
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch transactions', 500, 'TRANSACTIONS_FETCH_FAILED');
    }
  }
  
  /**
   * Get specific transaction by ID
   */
  async getTransactionById(userId, transactionId) {
    try {
      const transaction = await TransactionModel.findById(transactionId);
      
      if (!transaction || transaction.userId !== userId) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }
      
      // Enhance with additional context
      const enhancedTransaction = {
        ...transaction,
        impact: this.getTransactionImpact(transaction),
        category: this.categorizeTransaction(transaction),
        relatedData: await this.getRelatedTransactionData(transaction)
      };
      
      return {
        success: true,
        transaction: enhancedTransaction
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to fetch transaction', 500, 'TRANSACTION_FETCH_FAILED');
    }
  }
  
  /**
   * Update a transaction
   */
  async updateTransaction(userId, transactionId, updateData) {
    try {
      // Get the current transaction
      const currentTransaction = await TransactionModel.findById(transactionId);
      if (!currentTransaction || currentTransaction.userId !== userId) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }
      
      // Validate update data
      const validatedData = await this.validateTransactionUpdate(currentTransaction, updateData);
      
      // Calculate balance adjustments
      const oldImpact = this.calculateBalanceImpact(currentTransaction.type, currentTransaction.amount);
      const newImpact = this.calculateBalanceImpact(
        validatedData.type || currentTransaction.type,
        validatedData.amount || currentTransaction.amount
      );
      
      const balanceAdjustment = newImpact - oldImpact;
      
      // Update the transaction
      const updatedTransaction = await TransactionModel.update(transactionId, validatedData);
      
      // Update account balance if needed
      if (balanceAdjustment !== 0) {
        await AccountModel.updateBalance(currentTransaction.accountId, balanceAdjustment);
      }
      
      // Handle deposit/withdrawal total adjustments
      await this.adjustAccountTotals(currentTransaction, validatedData);
      
      return {
        success: true,
        transaction: updatedTransaction,
        message: 'Transaction updated successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update transaction', 500, 'TRANSACTION_UPDATE_FAILED');
    }
  }
  
  /**
   * Delete a transaction
   */
  async deleteTransaction(userId, transactionId) {
    try {
      // Get the transaction to delete
      const transaction = await TransactionModel.findById(transactionId);
      if (!transaction || transaction.userId !== userId) {
        throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
      }
      
      // Calculate reverse balance impact
      const balanceImpact = -this.calculateBalanceImpact(transaction.type, transaction.amount);
      let depositChange = 0;
      let withdrawalChange = 0;
      
      if (transaction.type === 'deposit') {
        depositChange = -transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        withdrawalChange = -transaction.amount;
      }
      
      // Delete the transaction
      const deleted = await TransactionModel.delete(transactionId);
      
      if (!deleted) {
        throw new AppError('Failed to delete transaction', 500, 'TRANSACTION_DELETION_FAILED');
      }
      
      // Update account balances
      await AccountModel.updateTotals(transaction.accountId, depositChange, withdrawalChange, balanceImpact);
      
      return {
        success: true,
        message: 'Transaction deleted successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete transaction', 500, 'TRANSACTION_DELETION_FAILED');
    }
  }
  
  /**
   * Get transaction statistics
   */
  async getTransactionStats(userId, options = {}) {
    try {
      const stats = await TransactionModel.getStatsByUserId(userId, options);
      
      // Enhance with additional insights
      const enhancedStats = {
        ...stats,
        insights: this.generateTransactionInsights(stats),
        trends: await this.calculateTransactionTrends(userId, options)
      };
      
      return {
        success: true,
        stats: enhancedStats
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch transaction statistics', 500, 'TRANSACTION_STATS_FAILED');
    }
  }
  
  /**
   * Get recent transactions
   */
  async getRecentTransactions(userId, limit = 10) {
    try {
      const transactions = await TransactionModel.getRecent(userId, limit);
      
      const enhancedTransactions = transactions.map(transaction => ({
        ...transaction,
        impact: this.getTransactionImpact(transaction),
        category: this.categorizeTransaction(transaction),
        timeAgo: this.calculateTimeAgo(transaction.createdAt)
      }));
      
      return {
        success: true,
        transactions: enhancedTransactions
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch recent transactions', 500, 'RECENT_TRANSACTIONS_FAILED');
    }
  }
  
  /**
   * Bulk create transactions
   */
  async bulkCreateTransactions(userId, transactionsData) {
    try {
      // Validate all transactions first
      const validatedTransactions = [];
      const errors = [];
      
      for (let i = 0; i < transactionsData.length; i++) {
        try {
          const validated = await this.validateBulkTransaction(userId, transactionsData[i], i);
          validatedTransactions.push(validated);
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            data: transactionsData[i]
          });
        }
      }
      
      if (errors.length > 0) {
        throw new AppError('Validation errors in bulk transaction data', 400, 'BULK_VALIDATION_FAILED', errors);
      }
      
      // Create all transactions
      const results = await TransactionModel.bulkCreate(validatedTransactions);
      
      // Update account balances for each affected account
      await this.updateAccountBalancesForBulkTransactions(validatedTransactions);
      
      return {
        success: true,
        transactions: results,
        message: `Successfully created ${results.length} transactions`
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create bulk transactions', 500, 'BULK_TRANSACTION_FAILED');
    }
  }
  
  /**
   * Get monthly transaction summary
   */
  async getMonthlyTransactionSummary(userId, year, month) {
    try {
      const summary = await TransactionModel.getMonthlySummary(userId, year, month);
      
      // Enhance with analytics
      const enhancedSummary = {
        raw: summary,
        analytics: this.analyzeMonthlyData(summary),
        period: {
          year,
          month,
          monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
        }
      };
      
      return {
        success: true,
        summary: enhancedSummary
      };
      
    } catch (error) {
      throw new AppError('Failed to get monthly summary', 500, 'MONTHLY_SUMMARY_FAILED');
    }
  }
  
  /**
   * Calculate balance impact of a transaction
   */
  calculateBalanceImpact(type, amount) {
    const numAmount = parseFloat(amount);
    
    switch (type) {
      case 'deposit':
      case 'bonus-credit':
      case 'historical-win':
        return numAmount;
      case 'withdrawal':
      case 'bet':
      case 'historical-loss':
        return -numAmount;
      default:
        return 0;
    }
  }
  
  /**
   * Validate transaction constraints
   */
  async validateTransactionConstraints(account, type, amount) {
    // Check withdrawal constraints
    if (type === 'withdrawal') {
      if (amount > account.balance) {
        throw new AppError('Insufficient balance for withdrawal', 400, 'INSUFFICIENT_BALANCE');
      }
    }
    
    // Check bet constraints
    if (type === 'bet') {
      // For non-bonus bets, check if there's sufficient balance
      if (amount > account.balance) {
        throw new AppError('Insufficient balance for bet', 400, 'INSUFFICIENT_BALANCE');
      }
    }
    
    // Check reasonable amount limits
    if (amount > 1000000) {
      throw new AppError('Transaction amount exceeds maximum limit', 400, 'AMOUNT_EXCEEDS_LIMIT');
    }
    
    return true;
  }
  
  /**
   * Validate transaction update data
   */
  async validateTransactionUpdate(currentTransaction, updateData) {
    const validatedData = {};
    
    if (updateData.type !== undefined) {
      if (!TransactionModel.validTypes.includes(updateData.type)) {
        throw new AppError(`Invalid transaction type: ${updateData.type}`, 400, 'INVALID_TRANSACTION_TYPE');
      }
      validatedData.type = updateData.type;
    }
    
    if (updateData.amount !== undefined) {
      const amount = parseFloat(updateData.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new AppError('Amount must be a positive number', 400, 'INVALID_AMOUNT');
      }
      validatedData.amount = amount;
    }
    
    if (updateData.description !== undefined) {
      if (typeof updateData.description !== 'string') {
        throw new AppError('Description must be a string', 400, 'INVALID_DESCRIPTION');
      }
      validatedData.description = updateData.description.trim();
    }
    
    return validatedData;
  }
  
  /**
   * Validate bulk transaction data
   */
  async validateBulkTransaction(userId, transactionData, index) {
    const { account_key, type, amount, description } = transactionData;
    
    // Validate required fields
    if (!account_key || !type || amount === undefined) {
      throw new Error(`Missing required fields at index ${index}`);
    }
    
    // Validate account
    const account = await AccountModel.findByUserAndKey(userId, account_key);
    if (!account) {
      throw new Error(`Account '${account_key}' not found at index ${index}`);
    }
    
    // Validate type
    if (!TransactionModel.validTypes.includes(type)) {
      throw new Error(`Invalid transaction type '${type}' at index ${index}`);
    }
    
    // Validate amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      throw new Error(`Invalid amount at index ${index}`);
    }
    
    return {
      account_id: account.id,
      account_key,
      type,
      amount: numAmount,
      description: description || '',
      transaction_date: new Date()
    };
  }
  
  /**
   * Update account balances for bulk transactions
   */
  async updateAccountBalancesForBulkTransactions(transactions) {
    // Group transactions by account
    const accountUpdates = {};
    
    transactions.forEach(transaction => {
      const accountId = transaction.account_id;
      if (!accountUpdates[accountId]) {
        accountUpdates[accountId] = {
          balanceChange: 0,
          depositChange: 0,
          withdrawalChange: 0
        };
      }
      
      const balanceImpact = this.calculateBalanceImpact(transaction.type, transaction.amount);
      accountUpdates[accountId].balanceChange += balanceImpact;
      
      if (transaction.type === 'deposit') {
        accountUpdates[accountId].depositChange += transaction.amount;
      } else if (transaction.type === 'withdrawal') {
        accountUpdates[accountId].withdrawalChange += transaction.amount;
      }
    });
    
    // Update each account
    for (const [accountId, updates] of Object.entries(accountUpdates)) {
      await AccountModel.updateTotals(
        parseInt(accountId),
        updates.depositChange,
        updates.withdrawalChange,
        updates.balanceChange
      );
    }
  }
  
  /**
   * Get transaction impact description
   */
  getTransactionImpact(transaction) {
    const impact = this.calculateBalanceImpact(transaction.type, transaction.amount);
    
    return {
      amount: Math.abs(impact),
      direction: impact > 0 ? 'positive' : impact < 0 ? 'negative' : 'neutral',
      description: impact > 0 ? `+${impact.toFixed(2)}` : impact < 0 ? `-${Math.abs(impact).toFixed(2)}` : '$0.00'
    };
  }
  
  /**
   * Categorize transaction for filtering/analytics
   */
  categorizeTransaction(transaction) {
    const { type } = transaction;
    
    const categories = {
      'deposit': 'funding',
      'withdrawal': 'funding',
      'bet': 'betting',
      'bonus-credit': 'bonus',
      'historical-win': 'historical',
      'historical-loss': 'historical'
    };
    
    return categories[type] || 'other';
  }
  
  /**
   * Get related data for a transaction
   */
  async getRelatedTransactionData(transaction) {
    const relatedData = {};
    
    // If it's a bet transaction, try to find the corresponding bet record
    if (transaction.type === 'bet') {
      try {
        const bets = await BetModel.findByUserId(transaction.userId, {
          accountKey: transaction.accountKey,
          startDate: transaction.date,
          endDate: transaction.date,
          limit: 10
        });
        
        // Find bet with matching amount and description
        const matchingBet = bets.bets?.find(bet => 
          Math.abs(bet.displayAmount - transaction.amount) < 0.01 &&
          bet.description === transaction.description
        );
        
        if (matchingBet) {
          relatedData.bet = matchingBet;
        }
      } catch (error) {
        // Ignore errors in related data fetching
      }
    }
    
    return relatedData;
  }
  
  /**
   * Generate transaction insights
   */
  generateTransactionInsights(stats) {
    const insights = [];
    
    // Analyze transaction patterns
    if (stats.byType) {
      const totalTransactions = stats.overall.totalTransactions;
      
      // Deposit insights
      if (stats.byType.deposit) {
        const depositRatio = (stats.byType.deposit.count / totalTransactions) * 100;
        if (depositRatio > 50) {
          insights.push('High frequency of deposits indicates active account funding');
        }
      }
      
      // Withdrawal insights
      if (stats.byType.withdrawal) {
        const withdrawalRatio = (stats.byType.withdrawal.count / totalTransactions) * 100;
        if (withdrawalRatio > 30) {
          insights.push('Frequent withdrawals suggest successful betting or cash management');
        }
      }
      
      // Betting insights
      if (stats.byType.bet) {
        const bettingRatio = (stats.byType.bet.count / totalTransactions) * 100;
        if (bettingRatio > 40) {
          insights.push('High betting activity - majority of transactions are bets');
        }
        
        if (stats.byType.bet.avgAmount > 100) {
          insights.push('Above average bet sizes indicate aggressive betting strategy');
        }
      }
      
      // Historical data insights
      const historicalCount = (stats.byType['historical-win']?.count || 0) + 
                             (stats.byType['historical-loss']?.count || 0);
      if (historicalCount > totalTransactions * 0.3) {
        insights.push('Significant amount of historical data imported');
      }
    }
    
    return insights;
  }
  
  /**
   * Calculate transaction trends
   */
  async calculateTransactionTrends(userId, options = {}) {
    try {
      // Get transactions from last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const transactions = await TransactionModel.getByDateRange(
        userId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
        options
      );
      
      // Calculate daily trends
      const dailyTrends = {};
      transactions.forEach(transaction => {
        const date = transaction.date;
        if (!dailyTrends[date]) {
          dailyTrends[date] = {
            count: 0,
            totalAmount: 0,
            netImpact: 0,
            byType: {}
          };
        }
        
        dailyTrends[date].count++;
        dailyTrends[date].totalAmount += transaction.amount;
        dailyTrends[date].netImpact += this.calculateBalanceImpact(transaction.type, transaction.amount);
        
        if (!dailyTrends[date].byType[transaction.type]) {
          dailyTrends[date].byType[transaction.type] = 0;
        }
        dailyTrends[date].byType[transaction.type]++;
      });
      
      // Calculate trend metrics
      const dates = Object.keys(dailyTrends).sort();
      const trendMetrics = {
        averageDailyTransactions: transactions.length / 30,
        mostActiveDay: null,
        leastActiveDay: null,
        totalDays: dates.length,
        averageDailyImpact: 0
      };
      
      if (dates.length > 0) {
        // Find most and least active days
        let maxActivity = 0;
        let minActivity = Infinity;
        let totalImpact = 0;
        
        dates.forEach(date => {
          const dayData = dailyTrends[date];
          totalImpact += dayData.netImpact;
          
          if (dayData.count > maxActivity) {
            maxActivity = dayData.count;
            trendMetrics.mostActiveDay = { date, count: dayData.count };
          }
          
          if (dayData.count < minActivity) {
            minActivity = dayData.count;
            trendMetrics.leastActiveDay = { date, count: dayData.count };
          }
        });
        
        trendMetrics.averageDailyImpact = totalImpact / dates.length;
      }
      
      return {
        dailyTrends,
        metrics: trendMetrics
      };
      
    } catch (error) {
      return null; // Return null if trends calculation fails
    }
  }
  
  /**
   * Analyze monthly transaction data
   */
  analyzeMonthlyData(monthlyData) {
    const analytics = {
      totalDays: Object.keys(monthlyData).length,
      averageDailyActivity: 0,
      peakActivityDays: [],
      quietDays: [],
      typeDistribution: {}
    };
    
    let totalTransactions = 0;
    const dailyActivityCount = [];
    
    // Analyze each day
    Object.entries(monthlyData).forEach(([day, dayData]) => {
      let dayTotal = 0;
      
      Object.entries(dayData).forEach(([type, typeData]) => {
        dayTotal += typeData.count;
        
        if (!analytics.typeDistribution[type]) {
          analytics.typeDistribution[type] = 0;
        }
        analytics.typeDistribution[type] += typeData.count;
      });
      
      dailyActivityCount.push(dayTotal);
      totalTransactions += dayTotal;
      
      // Identify peak and quiet days
      if (dayTotal >= 5) {
        analytics.peakActivityDays.push({ day: parseInt(day), count: dayTotal });
      } else if (dayTotal === 0) {
        analytics.quietDays.push(parseInt(day));
      }
    });
    
    analytics.averageDailyActivity = analytics.totalDays > 0 ? 
      totalTransactions / analytics.totalDays : 0;
    
    // Sort peak days by activity
    analytics.peakActivityDays.sort((a, b) => b.count - a.count);
    
    return analytics;
  }
  
  /**
   * Calculate time ago helper
   */
  calculateTimeAgo(dateTime) {
    const now = new Date();
    const date = new Date(dateTime);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
  
  /**
   * Adjust account totals after transaction update
   */
  async adjustAccountTotals(oldTransaction, newData) {
    let depositAdjustment = 0;
    let withdrawalAdjustment = 0;
    
    // Handle deposit total changes
    if (oldTransaction.type === 'deposit' && newData.type && newData.type !== 'deposit') {
      depositAdjustment -= oldTransaction.amount;
    } else if (oldTransaction.type !== 'deposit' && newData.type === 'deposit') {
      depositAdjustment += newData.amount || oldTransaction.amount;
    } else if (oldTransaction.type === 'deposit' && newData.amount) {
      depositAdjustment += newData.amount - oldTransaction.amount;
    }
    
    // Handle withdrawal total changes
    if (oldTransaction.type === 'withdrawal' && newData.type && newData.type !== 'withdrawal') {
      withdrawalAdjustment -= oldTransaction.amount;
    } else if (oldTransaction.type !== 'withdrawal' && newData.type === 'withdrawal') {
      withdrawalAdjustment += newData.amount || oldTransaction.amount;
    } else if (oldTransaction.type === 'withdrawal' && newData.amount) {
      withdrawalAdjustment += newData.amount - oldTransaction.amount;
    }
    
    // Update account if there are changes
    if (depositAdjustment !== 0 || withdrawalAdjustment !== 0) {
      await AccountModel.updateTotals(
        oldTransaction.accountId, 
        depositAdjustment, 
        withdrawalAdjustment, 
        0 // Balance change is handled separately
      );
    }
  }
  
  /**
   * Export transactions to CSV format
   */
  formatTransactionsForExport(transactions) {
    return transactions.map(transaction => ({
      Date: transaction.date,
      Account: transaction.accountName,
      Type: transaction.type,
      Amount: transaction.amount,
      Description: transaction.description,
      Impact: this.getTransactionImpact(transaction).description,
      Category: this.categorizeTransaction(transaction)
    }));
  }
  
  /**
   * Validate transaction import data
   */
  validateTransactionImportData(importData) {
    const errors = [];
    const validatedTransactions = [];
    
    importData.forEach((row, index) => {
      const rowErrors = [];
      
      // Validate required fields
      if (!row.Account) rowErrors.push('Account is required');
      if (!row.Type) rowErrors.push('Type is required');
      if (!row.Amount || isNaN(parseFloat(row.Amount))) rowErrors.push('Valid amount is required');
      
      // Validate transaction type
      if (row.Type && !TransactionModel.validTypes.includes(row.Type)) {
        rowErrors.push(`Invalid transaction type: ${row.Type}`);
      }
      
      if (rowErrors.length > 0) {
        errors.push({
          row: index + 1,
          errors: rowErrors,
          data: row
        });
      } else {
        validatedTransactions.push({
          account_key: row.Account,
          type: row.Type,
          amount: parseFloat(row.Amount),
          description: row.Description || '',
          date: row.Date || new Date().toISOString().split('T')[0]
        });
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      validatedTransactions
    };
  }
  
  /**
   * Get transaction summary for a date range
   */
  async getTransactionSummaryForDateRange(userId, startDate, endDate, accountKey = null) {
    try {
      const transactions = await TransactionModel.getByDateRange(
        userId, 
        startDate, 
        endDate, 
        { accountKey }
      );
      
      const summary = {
        totalTransactions: transactions.length,
        dateRange: { startDate, endDate },
        byType: {},
        totalAmount: 0,
        netImpact: 0,
        accounts: new Set(),
        dailyBreakdown: {}
      };
      
      transactions.forEach(transaction => {
        // Type breakdown
        if (!summary.byType[transaction.type]) {
          summary.byType[transaction.type] = {
            count: 0,
            totalAmount: 0,
            averageAmount: 0
          };
        }
        
        summary.byType[transaction.type].count++;
        summary.byType[transaction.type].totalAmount += transaction.amount;
        summary.byType[transaction.type].averageAmount = 
          summary.byType[transaction.type].totalAmount / summary.byType[transaction.type].count;
        
        // Overall totals
        summary.totalAmount += transaction.amount;
        summary.netImpact += this.calculateBalanceImpact(transaction.type, transaction.amount);
        summary.accounts.add(transaction.accountName);
        
        // Daily breakdown
        if (!summary.dailyBreakdown[transaction.date]) {
          summary.dailyBreakdown[transaction.date] = {
            count: 0,
            amount: 0,
            netImpact: 0
          };
        }
        
        summary.dailyBreakdown[transaction.date].count++;
        summary.dailyBreakdown[transaction.date].amount += transaction.amount;
        summary.dailyBreakdown[transaction.date].netImpact += 
          this.calculateBalanceImpact(transaction.type, transaction.amount);
      });
      
      summary.accounts = Array.from(summary.accounts);
      summary.averageAmount = summary.totalTransactions > 0 ? 
        summary.totalAmount / summary.totalTransactions : 0;
      
      return {
        success: true,
        summary
      };
      
    } catch (error) {
      throw new AppError('Failed to generate transaction summary', 500, 'SUMMARY_GENERATION_FAILED');
    }
  }
}

module.exports = new TransactionService();