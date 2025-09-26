const AccountModel = require('../models/Account.model');
const TransactionModel = require('../models/Transaction.model');
const BetModel = require('../models/Bet.model');
const { AppError } = require('../middleware/error.middleware');

class AccountService {
  /**
   * Get all accounts for a user with full data
   */
  async getUserAccounts(userId) {
    try {
      const accounts = await AccountModel.findByUserId(userId);
      
      // Calculate additional metrics for each account
      const enhancedAccounts = {};
      
      for (const [accountKey, accountData] of Object.entries(accounts)) {
        enhancedAccounts[accountKey] = {
          ...accountData,
          metrics: await this.calculateAccountMetrics(accountData)
        };
      }
      
      return {
        success: true,
        accounts: enhancedAccounts
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch user accounts', 500, 'ACCOUNTS_FETCH_FAILED');
    }
  }
  
  /**
   * Get specific account by key
   */
  async getAccountByKey(userId, accountKey) {
    try {
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      // Get full account data with transactions and bets
      const fullAccountData = await AccountModel.findByUserId(userId);
      const accountData = fullAccountData[accountKey];
      
      if (!accountData) {
        throw new AppError('Account data not found', 404, 'ACCOUNT_DATA_NOT_FOUND');
      }
      
      // Calculate metrics
      const metrics = await this.calculateAccountMetrics(accountData);
      
      return {
        success: true,
        account: {
          ...accountData,
          metrics
        }
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to fetch account', 500, 'ACCOUNT_FETCH_FAILED');
    }
  }
  
  /**
   * Create a new account
   */
  async createAccount(userId, accountData) {
    try {
      const { account_key, name, balance = 0 } = accountData;
      
      // Validate account key format
      if (!this.validateAccountKey(account_key)) {
        throw new AppError('Invalid account key format', 400, 'INVALID_ACCOUNT_KEY');
      }
      
      // Check if account key already exists for this user
      const existingAccount = await AccountModel.findByUserAndKey(userId, account_key);
      if (existingAccount) {
        throw new AppError('Account key already exists', 400, 'ACCOUNT_KEY_EXISTS');
      }
      
      // Create the account
      const account = await AccountModel.create(userId, {
        account_key,
        name: name.trim(),
        balance: parseFloat(balance)
      });
      
      return {
        success: true,
        account,
        message: 'Account created successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create account', 500, 'ACCOUNT_CREATION_FAILED');
    }
  }
  
  /**
   * Update account information
   */
  async updateAccount(userId, accountKey, updateData) {
    try {
      // Find the account first
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      // Validate update data
      const validatedData = this.validateAccountUpdateData(updateData);
      
      // Update the account
      const updatedAccount = await AccountModel.update(account.id, validatedData);
      
      return {
        success: true,
        account: updatedAccount,
        message: 'Account updated successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to update account', 500, 'ACCOUNT_UPDATE_FAILED');
    }
  }
  
  /**
   * Clear account data (reset balances, delete transactions and bets)
   */
  async clearAccount(userId, accountKey) {
    try {
      // Find the account first
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      // Clear all data for the account
      await AccountModel.clearData(account.id);
      
      return {
        success: true,
        message: `Account '${account.name}' data cleared successfully`
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to clear account data', 500, 'ACCOUNT_CLEAR_FAILED');
    }
  }
  
  /**
   * Delete account completely
   */
  async deleteAccount(userId, accountKey) {
    try {
      // Find the account first
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      // Delete the account and all associated data
      const deleted = await AccountModel.delete(account.id);
      
      if (!deleted) {
        throw new AppError('Failed to delete account', 500, 'ACCOUNT_DELETION_FAILED');
      }
      
      return {
        success: true,
        message: `Account '${account.name}' deleted successfully`
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete account', 500, 'ACCOUNT_DELETION_FAILED');
    }
  }
  
  /**
   * Get account statistics
   */
  async getAccountStats(userId, accountKey) {
    try {
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      const stats = await AccountModel.getStats(account.id);
      
      return {
        success: true,
        stats
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to fetch account statistics', 500, 'ACCOUNT_STATS_FAILED');
    }
  }
  
  /**
   * Recalculate account balance from transactions and bets
   */
  async recalculateAccountBalance(userId, accountKey) {
    try {
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      const recalculatedBalances = await AccountModel.recalculateBalance(account.id);
      
      return {
        success: true,
        balances: recalculatedBalances,
        message: 'Account balance recalculated successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to recalculate account balance', 500, 'BALANCE_RECALCULATION_FAILED');
    }
  }
  
  /**
   * Get account summary for dashboard
   */
  async getAccountsSummary(userId) {
    try {
      const summary = await AccountModel.getSummary(userId);
      
      // Add additional calculated metrics
      const enhancedSummary = {
        ...summary,
        metrics: {
          profitLoss: summary.totalBalance + summary.totalWithdrawals - summary.totalDeposits,
          withdrawalRate: summary.totalDeposits > 0 ? (summary.totalWithdrawals / summary.totalDeposits) * 100 : 0,
          avgAccountBalance: summary.totalAccounts > 0 ? summary.totalBalance / summary.totalAccounts : 0,
          totalInvested: summary.totalDeposits,
          totalReturned: summary.totalWithdrawals + summary.totalBalance,
          overallROI: summary.totalDeposits > 0 ? 
            (((summary.totalWithdrawals + summary.totalBalance) - summary.totalDeposits) / summary.totalDeposits) * 100 : 0
        }
      };
      
      return {
        success: true,
        summary: enhancedSummary
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch accounts summary', 500, 'SUMMARY_FETCH_FAILED');
    }
  }
  
  /**
   * Get recent account activity
   */
  async getRecentActivity(userId, limit = 10) {
    try {
      const activity = await AccountModel.getRecentActivity(userId, limit);
      
      // Enhance activity with additional context
      const enhancedActivity = activity.map(item => ({
        ...item,
        displayText: this.generateActivityDisplayText(item),
        category: this.categorizeActivity(item)
      }));
      
      return {
        success: true,
        activity: enhancedActivity
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch recent activity', 500, 'ACTIVITY_FETCH_FAILED');
    }
  }
  
  /**
   * Calculate comprehensive account metrics
   */
  async calculateAccountMetrics(accountData) {
    const { transactions, bets, balance, totalDeposits, totalWithdrawals } = accountData;
    
    // Transaction metrics
    const transactionMetrics = this.calculateTransactionMetrics(transactions);
    
    // Betting metrics
    const bettingMetrics = this.calculateBettingMetrics(bets);
    
    // Overall account metrics
    const overallMetrics = {
      netDeposits: totalDeposits - totalWithdrawals,
      accountROI: totalDeposits > 0 ? 
        (((balance + totalWithdrawals) - totalDeposits) / totalDeposits) * 100 : 0,
      totalActivity: transactions.length + bets.length,
      averageTransactionSize: transactions.length > 0 ? 
        transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0,
      balanceUtilization: totalDeposits > 0 ? (balance / totalDeposits) * 100 : 0
    };
    
    return {
      transactions: transactionMetrics,
      betting: bettingMetrics,
      overall: overallMetrics
    };
  }
  
  /**
   * Calculate transaction-specific metrics
   */
  calculateTransactionMetrics(transactions) {
    if (!transactions || transactions.length === 0) {
      return {
        total: 0,
        byType: {},
        averageAmount: 0,
        largestTransaction: 0,
        mostRecentDate: null
      };
    }
    
    const byType = {};
    let totalAmount = 0;
    let largestTransaction = 0;
    let mostRecentDate = null;
    
    transactions.forEach(transaction => {
      const type = transaction.type;
      const amount = transaction.amount;
      const date = new Date(transaction.date);
      
      if (!byType[type]) {
        byType[type] = { count: 0, totalAmount: 0, averageAmount: 0 };
      }
      
      byType[type].count++;
      byType[type].totalAmount += amount;
      byType[type].averageAmount = byType[type].totalAmount / byType[type].count;
      
      totalAmount += amount;
      
      if (amount > largestTransaction) {
        largestTransaction = amount;
      }
      
      if (!mostRecentDate || date > mostRecentDate) {
        mostRecentDate = date;
      }
    });
    
    return {
      total: transactions.length,
      byType,
      averageAmount: totalAmount / transactions.length,
      largestTransaction,
      mostRecentDate: mostRecentDate ? mostRecentDate.toISOString().split('T')[0] : null
    };
  }
  
  /**
   * Calculate betting-specific metrics
   */
  calculateBettingMetrics(bets) {
    if (!bets || bets.length === 0) {
      return {
        totalBets: 0,
        pendingBets: 0,
        settledBets: 0,
        wonBets: 0,
        lostBets: 0,
        winRate: 0,
        totalWagered: 0,
        totalWinnings: 0,
        netProfit: 0,
        roi: 0,
        averageBetSize: 0,
        largestBet: 0,
        largestWin: 0
      };
    }
    
    let totalWagered = 0;
    let totalWinnings = 0;
    let pendingBets = 0;
    let wonBets = 0;
    let lostBets = 0;
    let largestBet = 0;
    let largestWin = 0;
    
    bets.forEach(bet => {
      const amount = bet.amount || 0;
      const winnings = bet.winnings || 0;
      
      if (bet.status === 'pending') {
        pendingBets++;
      } else if (bet.status === 'won') {
        wonBets++;
        totalWinnings += winnings;
        if (winnings > largestWin) {
          largestWin = winnings;
        }
      } else if (bet.status === 'lost') {
        lostBets++;
      }
      
      if (!bet.isBonusBet) {
        totalWagered += amount;
      }
      
      if (amount > largestBet) {
        largestBet = amount;
      }
    });
    
    const settledBets = wonBets + lostBets;
    const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;
    const netProfit = totalWinnings - totalWagered;
    const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
    
    return {
      totalBets: bets.length,
      pendingBets,
      settledBets,
      wonBets,
      lostBets,
      winRate: parseFloat(winRate.toFixed(2)),
      totalWagered,
      totalWinnings,
      netProfit,
      roi: parseFloat(roi.toFixed(2)),
      averageBetSize: bets.length > 0 ? totalWagered / bets.length : 0,
      largestBet,
      largestWin
    };
  }
  
  /**
   * Generate display text for activity items
   */
  generateActivityDisplayText(activity) {
    const { type, action, amount, accountName } = activity;
    
    if (type === 'transaction') {
      switch (action) {
        case 'deposit':
          return `Deposited $${amount.toFixed(2)} to ${accountName}`;
        case 'withdrawal':
          return `Withdrew $${amount.toFixed(2)} from ${accountName}`;
        case 'bonus-credit':
          return `Received $${amount.toFixed(2)} bonus credit in ${accountName}`;
        case 'historical-win':
          return `Historical win of $${amount.toFixed(2)} in ${accountName}`;
        case 'historical-loss':
          return `Historical loss of $${amount.toFixed(2)} in ${accountName}`;
        default:
          return `${action} of $${amount.toFixed(2)} in ${accountName}`;
      }
    } else if (type === 'bet') {
      switch (action) {
        case 'pending':
          return `Placed $${amount.toFixed(2)} bet in ${accountName}`;
        case 'won':
          return `Won $${amount.toFixed(2)} bet in ${accountName}`;
        case 'lost':
          return `Lost $${amount.toFixed(2)} bet in ${accountName}`;
        default:
          return `${action} bet of $${amount.toFixed(2)} in ${accountName}`;
      }
    }
    
    return `${action} in ${accountName}`;
  }
  
  /**
   * Categorize activity for filtering/grouping
   */
  categorizeActivity(activity) {
    const { type, action } = activity;
    
    if (type === 'transaction') {
      if (['deposit', 'bonus-credit', 'historical-win'].includes(action)) return 'positive';
      if (['withdrawal', 'historical-loss'].includes(action)) return 'negative';
      return 'neutral';
    } else if (type === 'bet') {
      if (action === 'won') return 'positive';
      if (action === 'lost') return 'negative';
      return 'neutral'; // pending
    }
    
    return 'neutral';
  }
  
  /**
   * Validate account key format
   */
  validateAccountKey(accountKey) {
    // Account key should be alphanumeric with hyphens and underscores, 3-50 characters
    const accountKeyRegex = /^[a-zA-Z0-9_-]{3,50}$/;
    return accountKeyRegex.test(accountKey);
  }
  
  /**
   * Validate account update data
   */
  validateAccountUpdateData(updateData) {
    const validatedData = {};
    
    if (updateData.name !== undefined) {
      if (typeof updateData.name !== 'string' || updateData.name.trim().length === 0) {
        throw new AppError('Account name must be a non-empty string', 400, 'INVALID_ACCOUNT_NAME');
      }
      if (updateData.name.trim().length > 100) {
        throw new AppError('Account name must be no more than 100 characters', 400, 'ACCOUNT_NAME_TOO_LONG');
      }
      validatedData.name = updateData.name.trim();
    }
    
    if (updateData.balance !== undefined) {
      const balance = parseFloat(updateData.balance);
      if (isNaN(balance)) {
        throw new AppError('Balance must be a valid number', 400, 'INVALID_BALANCE');
      }
      validatedData.balance = balance;
    }
    
    return validatedData;
  }
  
  /**
   * Get account performance comparison
   */
  async compareAccountPerformance(userId) {
    try {
      const accounts = await AccountModel.findByUserId(userId);
      const comparison = [];
      
      for (const [accountKey, accountData] of Object.entries(accounts)) {
        const metrics = await this.calculateAccountMetrics(accountData);
        
        comparison.push({
          accountKey,
          name: accountData.name,
          balance: accountData.balance,
          totalDeposits: accountData.totalDeposits,
          totalWithdrawals: accountData.totalWithdrawals,
          roi: metrics.overall.accountROI,
          winRate: metrics.betting.winRate,
          totalBets: metrics.betting.totalBets,
          netProfit: metrics.betting.netProfit,
          performance: this.calculatePerformanceScore(metrics)
        });
      }
      
      // Sort by performance score
      comparison.sort((a, b) => b.performance - a.performance);
      
      return {
        success: true,
        comparison
      };
      
    } catch (error) {
      throw new AppError('Failed to compare account performance', 500, 'COMPARISON_FAILED');
    }
  }
  
  /**
   * Calculate overall performance score for an account
   */
  calculatePerformanceScore(metrics) {
    const { overall, betting } = metrics;
    
    // Weighted scoring system
    let score = 0;
    
    // ROI weight: 40%
    if (overall.accountROI > 10) score += 40;
    else if (overall.accountROI > 5) score += 30;
    else if (overall.accountROI > 0) score += 20;
    else if (overall.accountROI > -5) score += 10;
    
    // Win rate weight: 30%
    if (betting.winRate > 60) score += 30;
    else if (betting.winRate > 55) score += 25;
    else if (betting.winRate > 50) score += 20;
    else if (betting.winRate > 45) score += 15;
    else if (betting.winRate > 40) score += 10;
    
    // Activity weight: 20%
    if (betting.totalBets > 100) score += 20;
    else if (betting.totalBets > 50) score += 15;
    else if (betting.totalBets > 20) score += 10;
    else if (betting.totalBets > 5) score += 5;
    
    // Net profit weight: 10%
    if (betting.netProfit > 1000) score += 10;
    else if (betting.netProfit > 500) score += 8;
    else if (betting.netProfit > 100) score += 6;
    else if (betting.netProfit > 0) score += 4;
    
    return Math.round(score);
  }
  
  /**
   * Get account trends over time
   */
  async getAccountTrends(userId, accountKey, days = 30) {
    try {
      const account = await AccountModel.findByUserAndKey(userId, accountKey);
      if (!account) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get transactions and bets within the date range
      const transactions = await TransactionModel.getByDateRange(
        userId, 
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0],
        { accountKey }
      );
      
      const bets = await BetModel.findByUserId(userId, {
        accountKey,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 1000 // Get all bets in range
      });
      
      // Calculate daily trends
      const trends = this.calculateDailyTrends(transactions, bets.bets || [], days);
      
      return {
        success: true,
        trends,
        period: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          days
        }
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to calculate account trends', 500, 'TRENDS_CALCULATION_FAILED');
    }
  }
  
  /**
   * Calculate daily trends from transactions and bets
   */
  calculateDailyTrends(transactions, bets, days) {
    const trends = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Filter transactions for this date
      const dayTransactions = transactions.filter(t => t.date === dateString);
      
      // Filter bets for this date
      const dayBets = bets.filter(b => b.date === dateString);
      
      // Calculate daily metrics
      const transactionAmount = dayTransactions.reduce((sum, t) => {
        const impact = TransactionModel.getBalanceImpact(t.type, t.amount);
        return sum + impact;
      }, 0);
      
      const betsPlaced = dayBets.length;
      const betsWon = dayBets.filter(b => b.status === 'won').length;
      const betsLost = dayBets.filter(b => b.status === 'lost').length;
      const bettingProfit = dayBets
        .filter(b => b.status === 'won')
        .reduce((sum, b) => sum + (b.winnings - b.amount), 0) -
        dayBets
        .filter(b => b.status === 'lost')
        .reduce((sum, b) => sum + b.amount, 0);
      
      trends.push({
        date: dateString,
        transactionImpact: transactionAmount,
        betsPlaced,
        betsWon,
        betsLost,
        bettingProfit,
        totalActivity: dayTransactions.length + dayBets.length,
        winRate: (betsWon + betsLost) > 0 ? (betsWon / (betsWon + betsLost)) * 100 : 0
      });
    }
    
    return trends;
  }
  
  /**
   * Validate account access permissions
   */
  async validateAccountAccess(userId, accountKey) {
    const account = await AccountModel.findByUserAndKey(userId, accountKey);
    if (!account) {
      throw new AppError('Account not found or access denied', 404, 'ACCOUNT_ACCESS_DENIED');
    }
    return account;
  }
  
  /**
   * Get account health score
   */
  calculateAccountHealth(accountData) {
    const { balance, totalDeposits, totalWithdrawals } = accountData;
    const metrics = this.calculateAccountMetrics(accountData);
    
    let healthScore = 50; // Base score
    
    // Balance health (30% weight)
    if (balance > totalDeposits * 0.5) healthScore += 15;
    else if (balance > totalDeposits * 0.2) healthScore += 10;
    else if (balance > 0) healthScore += 5;
    else healthScore -= 10;
    
    // ROI health (25% weight)
    const roi = metrics.overall.accountROI;
    if (roi > 10) healthScore += 12;
    else if (roi > 5) healthScore += 8;
    else if (roi > 0) healthScore += 5;
    else if (roi > -5) healthScore -= 2;
    else healthScore -= 8;
    
    // Win rate health (20% weight)
    const winRate = metrics.betting.winRate;
    if (winRate > 55) healthScore += 10;
    else if (winRate > 50) healthScore += 7;
    else if (winRate > 45) healthScore += 3;
    else if (winRate < 40) healthScore -= 5;
    
    // Activity health (15% weight)
    const totalActivity = metrics.overall.totalActivity;
    if (totalActivity > 50) healthScore += 7;
    else if (totalActivity > 20) healthScore += 5;
    else if (totalActivity > 5) healthScore += 2;
    else if (totalActivity === 0) healthScore -= 5;
    
    // Risk management (10% weight)
    const avgBetSize = metrics.betting.averageBetSize;
    const balanceUtilization = metrics.overall.balanceUtilization;
    if (balanceUtilization < 200 && avgBetSize < balance * 0.1) healthScore += 5;
    else if (balanceUtilization > 500 || avgBetSize > balance * 0.3) healthScore -= 5;
    
    return Math.max(0, Math.min(100, Math.round(healthScore)));
  }
  
  /**
   * Generate account insights and recommendations
   */
  async generateAccountInsights(accountData) {
    const metrics = await this.calculateAccountMetrics(accountData);
    const healthScore = this.calculateAccountHealth(accountData);
    const insights = [];
    const recommendations = [];
    
    // Performance insights
    if (metrics.betting.winRate > 55) {
      insights.push(`Excellent win rate of ${metrics.betting.winRate.toFixed(1)}%`);
    } else if (metrics.betting.winRate < 45) {
      insights.push(`Below average win rate of ${metrics.betting.winRate.toFixed(1)}%`);
      recommendations.push('Consider reviewing your betting strategy');
    }
    
    // ROI insights
    if (metrics.overall.accountROI > 10) {
      insights.push(`Strong ROI of ${metrics.overall.accountROI.toFixed(1)}%`);
    } else if (metrics.overall.accountROI < 0) {
      insights.push(`Negative ROI of ${metrics.overall.accountROI.toFixed(1)}%`);
      recommendations.push('Focus on risk management and selective betting');
    }
    
    // Balance management insights
    if (accountData.balance < accountData.totalDeposits * 0.1) {
      insights.push('Low account balance relative to deposits');
      recommendations.push('Consider depositing more funds or reducing bet sizes');
    }
    
    // Activity insights
    if (metrics.overall.totalActivity < 10) {
      insights.push('Limited betting activity');
      recommendations.push('Increase activity to build meaningful statistics');
    }
    
    return {
      healthScore,
      insights,
      recommendations
    };
  }
}

module.exports = new AccountService();