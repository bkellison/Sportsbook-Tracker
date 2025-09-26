const BetModel = require('../models/Bet.model');
const AccountModel = require('../models/Account.model');
const { AppError } = require('../middleware/error.middleware');

class BetService {
  /**
   * Create a new bet
   */
  async createBet(userId, betData) {
    try {
      const { account, amount, displayAmount, description, isBonusBet = false } = betData;
      
      // Find and validate account
      const accountData = await AccountModel.findByUserAndKey(userId, account);
      if (!accountData) {
        throw new AppError('Account not found', 404, 'ACCOUNT_NOT_FOUND');
      }
      
      // Validate amounts
      const betAmount = parseFloat(amount);
      const betDisplayAmount = parseFloat(displayAmount || amount);
      
      if (isNaN(betAmount) || betAmount < 0) {
        throw new AppError('Invalid bet amount', 400, 'INVALID_BET_AMOUNT');
      }
      
      if (isNaN(betDisplayAmount) || betDisplayAmount < 0) {
        throw new AppError('Invalid display amount', 400, 'INVALID_DISPLAY_AMOUNT');
      }
      
      // Validate balance for non-bonus bets
      if (!isBonusBet && betAmount > accountData.balance) {
        throw new AppError('Insufficient balance for bet', 400, 'INSUFFICIENT_BALANCE');
      }
      
      // Create the bet
      const actualBetAmount = isBonusBet ? 0 : betAmount; // No real money risked for bonus bets
      const bet = await BetModel.create({
        account_id: accountData.id,
        amount: actualBetAmount,
        display_amount: betDisplayAmount,
        description: description || '',
        bet_date: new Date(),
        is_bonus_bet: isBonusBet,
        status: 'pending'
      });
      
      // Update account balance for non-bonus bets
      if (!isBonusBet && betAmount > 0) {
        await AccountModel.updateBalance(accountData.id, -betAmount);
      }
      
      return {
        success: true,
        bet: await BetModel.findById(bet.id),
        message: 'Bet created successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create bet', 500, 'BET_CREATION_FAILED');
    }
  }
  
  /**
   * Get all bets for a user with filtering and pagination
   */
  async getUserBets(userId, options = {}) {
    try {
      const result = await BetModel.findByUserId(userId, options);
      
      // Enhance bets with additional context
      const enhancedBets = result.bets.map(bet => ({
        ...bet,
        profitLoss: this.calculateBetProfitLoss(bet),
        potentialPayout: this.calculatePotentialPayout(bet),
        riskLevel: this.assessBetRisk(bet),
        timeStatus: this.getBetTimeStatus(bet)
      }));
      
      return {
        success: true,
        bets: enhancedBets,
        pagination: result.pagination
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch bets', 500, 'BETS_FETCH_FAILED');
    }
  }
  
  /**
   * Get specific bet by ID
   */
  async getBetById(userId, betId) {
    try {
      const bet = await BetModel.findById(betId);
      
      if (!bet || bet.userId !== userId) {
        throw new AppError('Bet not found', 404, 'BET_NOT_FOUND');
      }
      
      // Enhance with additional context
      const enhancedBet = {
        ...bet,
        profitLoss: this.calculateBetProfitLoss(bet),
        potentialPayout: this.calculatePotentialPayout(bet),
        riskLevel: this.assessBetRisk(bet),
        timeStatus: this.getBetTimeStatus(bet),
        insights: this.generateBetInsights(bet)
      };
      
      return {
        success: true,
        bet: enhancedBet
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to fetch bet', 500, 'BET_FETCH_FAILED');
    }
  }
  
  /**
   * Update bet status (settle bet)
   */
  async settleBet(userId, betId, settlementData) {
    try {
      const { status, winnings = 0 } = settlementData;
      
      // Validate status
      if (!['won', 'lost'].includes(status)) {
        throw new AppError('Invalid settlement status', 400, 'INVALID_SETTLEMENT_STATUS');
      }
      
      // Get the bet
      const bet = await BetModel.findById(betId);
      if (!bet || bet.userId !== userId) {
        throw new AppError('Bet not found', 404, 'BET_NOT_FOUND');
      }
      
      if (bet.status !== 'pending') {
        throw new AppError('Can only settle pending bets', 400, 'BET_ALREADY_SETTLED');
      }
      
      // Validate winnings for won bets
      if (status === 'won') {
        const winningsAmount = parseFloat(winnings);
        if (isNaN(winningsAmount) || winningsAmount <= 0) {
          throw new AppError('Valid winnings amount required for won bets', 400, 'INVALID_WINNINGS');
        }
      }
      
      // Update bet status
      const updatedBet = await BetModel.updateStatus(betId, status, parseFloat(winnings));
      
      // Update account balance for winning bets
      if (status === 'won' && parseFloat(winnings) > 0) {
        await AccountModel.updateBalance(bet.accountId, parseFloat(winnings));
      }
      
      // Generate settlement summary
      const settlementSummary = this.generateSettlementSummary(bet, status, winnings);
      
      return {
        success: true,
        bet: updatedBet,
        settlement: settlementSummary,
        message: `Bet settled as ${status}`
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to settle bet', 500, 'BET_SETTLEMENT_FAILED');
    }
  }
  
  /**
   * Delete a bet
   */
  async deleteBet(userId, betId) {
    try {
      // Get the bet to delete
      const bet = await BetModel.findById(betId);
      if (!bet || bet.userId !== userId) {
        throw new AppError('Bet not found', 404, 'BET_NOT_FOUND');
      }
      
      // Calculate balance adjustment needed
      let balanceAdjustment = 0;
      
      if (bet.status === 'pending' && !bet.isBonusBet && bet.amount > 0) {
        // Return money to balance for pending non-bonus bets
        balanceAdjustment = bet.amount;
      } else if (bet.status === 'won') {
        // Remove winnings from balance
        balanceAdjustment = -bet.winnings;
      }
      
      // Delete the bet
      const deleted = await BetModel.delete(betId);
      
      if (!deleted) {
        throw new AppError('Failed to delete bet', 500, 'BET_DELETION_FAILED');
      }
      
      // Update account balance if needed
      if (balanceAdjustment !== 0) {
        await AccountModel.updateBalance(bet.accountId, balanceAdjustment);
      }
      
      return {
        success: true,
        message: 'Bet deleted successfully',
        balanceAdjustment
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to delete bet', 500, 'BET_DELETION_FAILED');
    }
  }
  
  /**
   * Get betting statistics
   */
  async getBettingStats(userId, options = {}) {
    try {
      const stats = await BetModel.getStatsByUserId(userId, options);
      
      // Enhance with additional insights and analysis
      const enhancedStats = {
        ...stats,
        insights: this.generateBettingInsights(stats),
        performance: this.analyzeBettingPerformance(stats),
        recommendations: this.generateBettingRecommendations(stats)
      };
      
      return {
        success: true,
        stats: enhancedStats
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch betting statistics', 500, 'BETTING_STATS_FAILED');
    }
  }
  
  /**
   * Get pending bets
   */
  async getPendingBets(userId) {
    try {
      const pendingBets = await BetModel.getPendingByUserId(userId);
      
      const enhancedPendingBets = pendingBets.map(bet => ({
        ...bet,
        potentialPayout: this.calculatePotentialPayout(bet),
        riskLevel: this.assessBetRisk(bet),
        timeStatus: this.getBetTimeStatus(bet),
        daysOutstanding: this.calculateDaysOutstanding(bet.date)
      }));
      
      // Sort by date (most recent first)
      enhancedPendingBets.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      return {
        success: true,
        pendingBets: enhancedPendingBets,
        summary: {
          totalPending: enhancedPendingBets.length,
          totalRisk: enhancedPendingBets.reduce((sum, bet) => sum + bet.amount, 0),
          totalPotentialWinnings: enhancedPendingBets.reduce((sum, bet) => sum + bet.potentialPayout, 0)
        }
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch pending bets', 500, 'PENDING_BETS_FAILED');
    }
  }
  
  /**
   * Get betting streak information
   */
  async getBettingStreak(userId, accountKey = null) {
    try {
      const streak = await BetModel.getStreakInfo(userId, accountKey);
      
      // Enhance with additional analysis
      const enhancedStreak = {
        ...streak,
        streakAnalysis: this.analyzeStreak(streak),
        streakRecommendations: this.generateStreakRecommendations(streak)
      };
      
      return {
        success: true,
        streak: enhancedStreak
      };
      
    } catch (error) {
      throw new AppError('Failed to fetch betting streak', 500, 'BETTING_STREAK_FAILED');
    }
  }
  
  /**
   * Bulk create bets
   */
  async bulkCreateBets(userId, betsData) {
    try {
      // Validate all bets first
      const validatedBets = [];
      const errors = [];
      
      for (let i = 0; i < betsData.length; i++) {
        try {
          const validated = await this.validateBulkBet(userId, betsData[i], i);
          validatedBets.push(validated);
        } catch (error) {
          errors.push({
            index: i,
            error: error.message,
            data: betsData[i]
          });
        }
      }
      
      if (errors.length > 0) {
        throw new AppError('Validation errors in bulk bet data', 400, 'BULK_VALIDATION_FAILED', errors);
      }
      
      // Create all bets
      const results = await BetModel.bulkCreate(validatedBets);
      
      // Update account balances for non-bonus bets
      await this.updateAccountBalancesForBulkBets(validatedBets);
      
      return {
        success: true,
        bets: results,
        message: `Successfully created ${results.length} bets`
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Failed to create bulk bets', 500, 'BULK_BET_FAILED');
    }
  }
  
  /**
   * Get monthly betting summary
   */
  async getMonthlyBettingSummary(userId, year, month) {
    try {
      const summary = await BetModel.getMonthlySummary(userId, year, month);
      
      // Enhance with analytics
      const enhancedSummary = {
        raw: summary,
        analytics: this.analyzeMonthlyBettingData(summary),
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
      throw new AppError('Failed to get monthly betting summary', 500, 'MONTHLY_BETTING_SUMMARY_FAILED');
    }
  }
  
  /**
   * Calculate bet profit/loss
   */
  calculateBetProfitLoss(bet) {
    if (bet.status === 'won') {
      return {
        amount: bet.winnings - bet.amount,
        type: 'profit',
        percentage: bet.amount > 0 ? ((bet.winnings - bet.amount) / bet.amount) * 100 : 0
      };
    } else if (bet.status === 'lost') {
      return {
        amount: -bet.amount,
        type: 'loss',
        percentage: -100
      };
    }
    
    return {
      amount: 0,
      type: 'pending',
      percentage: 0
    };
  }
  
  /**
   * Calculate potential payout for pending bets
   */
  calculatePotentialPayout(bet) {
    if (bet.status !== 'pending') {
      return bet.status === 'won' ? bet.winnings : 0;
    }
    
    // For pending bets, we don't know the odds, so we can't calculate potential payout
    // This would need additional data like odds to be meaningful
    return 0;
  }
  
  /**
   * Assess bet risk level
   */
  assessBetRisk(bet) {
    const amount = bet.amount;
    
    if (bet.isBonusBet) return 'none';
    if (amount < 10) return 'low';
    if (amount < 50) return 'medium';
    if (amount < 200) return 'high';
    return 'very-high';
  }
  
  /**
   * Get bet time status
   */
  getBetTimeStatus(bet) {
    const betDate = new Date(bet.date);
    const now = new Date();
    const daysDiff = Math.floor((now - betDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 0) return 'today';
    if (daysDiff === 1) return 'yesterday';
    if (daysDiff < 7) return 'this-week';
    if (daysDiff < 30) return 'this-month';
    return 'older';
  }
  
  /**
   * Calculate days outstanding for pending bets
   */
  calculateDaysOutstanding(betDate) {
    const date = new Date(betDate);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }
  
  /**
   * Generate bet insights
   */
  generateBetInsights(bet) {
    const insights = [];
    
    if (bet.isBonusBet) {
      insights.push('Risk-free bonus bet');
    }
    
    const riskLevel = this.assessBetRisk(bet);
    if (riskLevel === 'very-high') {
      insights.push('High-risk bet - consider stake management');
    }
    
    if (bet.status === 'pending') {
      const daysOutstanding = this.calculateDaysOutstanding(bet.date);
      if (daysOutstanding > 7) {
        insights.push(`Pending for ${daysOutstanding} days - consider following up`);
      }
    }
    
    if (bet.status === 'won') {
      const profitLoss = this.calculateBetProfitLoss(bet);
      if (profitLoss.percentage > 200) {
        insights.push('Excellent return on investment');
      }
    }
    
    return insights;
  }
  
  /**
   * Generate settlement summary
   */
  generateSettlementSummary(bet, status, winnings) {
    const summary = {
      betAmount: bet.amount,
      displayAmount: bet.displayAmount,
      status,
      winnings: parseFloat(winnings || 0),
      netResult: 0,
      roi: 0
    };
    
    if (status === 'won') {
      summary.netResult = summary.winnings - bet.amount;
      summary.roi = bet.amount > 0 ? (summary.netResult / bet.amount) * 100 : 0;
    } else if (status === 'lost') {
      summary.netResult = -bet.amount;
      summary.roi = -100;
    }
    
    return summary;
  }
  
  /**
   * Generate betting insights from statistics
   */
  generateBettingInsights(stats) {
    const insights = [];
    const { summary } = stats;
    
    // Win rate insights
    if (summary.winRate > 60) {
      insights.push('Excellent win rate - you\'re beating the odds consistently');
    } else if (summary.winRate > 55) {
      insights.push('Good win rate - above average performance');
    } else if (summary.winRate < 45) {
      insights.push('Below average win rate - consider strategy review');
    }
    
    // ROI insights
    if (summary.roi > 15) {
      insights.push('Outstanding ROI - exceptional betting performance');
    } else if (summary.roi > 5) {
      insights.push('Solid ROI - profitable betting strategy');
    } else if (summary.roi < -10) {
      insights.push('Concerning ROI - significant losses detected');
    }
    
    // Volume insights
    if (summary.totalBets > 100) {
      insights.push('High volume bettor - sufficient data for analysis');
    } else if (summary.totalBets < 20) {
      insights.push('Limited betting history - more data needed for meaningful analysis');
    }
    
    // Bonus bet insights
    if (summary.bonusBets > summary.totalBets * 0.3) {
      insights.push('Heavy use of bonus bets - good risk management');
    }
    
    return insights;
  }
  
  /**
   * Analyze betting performance
   */
  analyzeBettingPerformance(stats) {
    const { summary } = stats;
    
    const performance = {
      grade: 'F',
      score: 0,
      strengths: [],
      weaknesses: [],
      overallAssessment: ''
    };
    
    let score = 0;
    
    // Win rate scoring (40% weight)
    if (summary.winRate >= 60) {
      score += 40;
      performance.strengths.push('Excellent win rate');
    } else if (summary.winRate >= 55) {
      score += 32;
      performance.strengths.push('Good win rate');
    } else if (summary.winRate >= 50) {
      score += 24;
    } else if (summary.winRate >= 45) {
      score += 16;
    } else {
      performance.weaknesses.push('Poor win rate');
    }
    
    // ROI scoring (35% weight)
    if (summary.roi >= 15) {
      score += 35;
      performance.strengths.push('Outstanding ROI');
    } else if (summary.roi >= 5) {
      score += 28;
      performance.strengths.push('Profitable ROI');
    } else if (summary.roi >= 0) {
      score += 21;
    } else if (summary.roi >= -10) {
      score += 14;
    } else {
      performance.weaknesses.push('Significant losses');
    }
    
    // Volume scoring (15% weight)
    if (summary.totalBets >= 50) {
      score += 15;
      performance.strengths.push('Sufficient betting volume');
    } else if (summary.totalBets >= 20) {
      score += 12;
    } else {
      score += 6;
      performance.weaknesses.push('Limited betting history');
    }
    
    // Risk management scoring (10% weight)
    if (summary.avgBetSize < summary.totalWagered * 0.05) {
      score += 10;
      performance.strengths.push('Good bet sizing');
    } else if (summary.avgBetSize < summary.totalWagered * 0.1) {
      score += 7;
    } else {
      performance.weaknesses.push('Large average bet size');
    }
    
    performance.score = Math.round(score);
    
    // Assign grade
    if (score >= 85) performance.grade = 'A';
    else if (score >= 75) performance.grade = 'B';
    else if (score >= 65) performance.grade = 'C';
    else if (score >= 55) performance.grade = 'D';
    else performance.grade = 'F';
    
    // Overall assessment
    if (score >= 80) {
      performance.overallAssessment = 'Excellent betting performance with strong fundamentals';
    } else if (score >= 70) {
      performance.overallAssessment = 'Good betting performance with room for improvement';
    } else if (score >= 60) {
      performance.overallAssessment = 'Average performance - focus on consistency';
    } else if (score >= 50) {
      performance.overallAssessment = 'Below average performance - strategy review needed';
    } else {
      performance.overallAssessment = 'Poor performance - significant improvements required';
    }
    
    return performance;
  }
  
  /**
   * Generate betting recommendations
   */
  generateBettingRecommendations(stats) {
    const recommendations = [];
    const { summary } = stats;
    
    // Win rate recommendations
    if (summary.winRate < 50) {
      recommendations.push({
        category: 'strategy',
        priority: 'high',
        message: 'Focus on quality over quantity - be more selective with bets'
      });
    }
    
    // ROI recommendations
    if (summary.roi < 0) {
      recommendations.push({
        category: 'risk-management',
        priority: 'high',
        message: 'Implement strict bankroll management and reduce bet sizes'
      });
    }
    
    // Bet sizing recommendations
    if (summary.avgBetSize > summary.totalWagered * 0.1) {
      recommendations.push({
        category: 'bankroll-management',
        priority: 'medium',
        message: 'Consider reducing average bet size for better risk management'
      });
    }
    
    // Volume recommendations
    if (summary.totalBets < 20) {
      recommendations.push({
        category: 'activity',
        priority: 'low',
        message: 'Increase betting volume to build meaningful statistics'
      });
    }
    
    // Bonus bet recommendations
    if (summary.bonusBets < summary.totalBets * 0.1) {
      recommendations.push({
        category: 'value',
        priority: 'low',
        message: 'Look for more bonus bet opportunities to reduce risk'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Analyze betting streak
   */
  analyzeStreak(streak) {
    const analysis = {
      currentStatus: 'neutral',
      streakSignificance: 'low',
      psychological: [],
      recommendations: []
    };
    
    if (streak.currentStreak === 0) {
      analysis.currentStatus = 'neutral';
      analysis.psychological.push('Fresh start - no current streak pressure');
    } else if (streak.currentStreakType === 'won') {
      analysis.currentStatus = 'positive';
      if (streak.currentStreak >= 5) {
        analysis.streakSignificance = 'high';
        analysis.psychological.push('Hot streak - maintain discipline, avoid overconfidence');
      } else {
        analysis.psychological.push('Positive momentum - capitalize carefully');
      }
    } else if (streak.currentStreakType === 'lost') {
      analysis.currentStatus = 'negative';
      if (streak.currentStreak >= 5) {
        analysis.streakSignificance = 'high';
        analysis.psychological.push('Cold streak - avoid chasing losses');
      } else {
        analysis.psychological.push('Minor setback - stay patient');
      }
    }
    
    return analysis;
  }
  
  /**
   * Generate streak-based recommendations
   */
  generateStreakRecommendations(streak) {
    const recommendations = [];
    
    if (streak.currentStreakType === 'won' && streak.currentStreak >= 3) {
      recommendations.push('Consider taking partial profits while maintaining discipline');
      recommendations.push('Don\'t increase bet sizes due to winning streak');
    }
    
    if (streak.currentStreakType === 'lost' && streak.currentStreak >= 3) {
      recommendations.push('Take a break to reassess strategy');
      recommendations.push('Consider reducing bet sizes temporarily');
      recommendations.push('Don\'t chase losses with larger bets');
    }
    
    if (streak.longestWinStreak > 10) {
      recommendations.push('Excellent streak management - maintain current approach');
    }
    
    if (streak.longestLoseStreak > 10) {
      recommendations.push('Review betting strategy during losing periods');
    }
    
    return recommendations;
  }
  
  /**
   * Validate bulk bet data
   */
  async validateBulkBet(userId, betData, index) {
    const { account_key, amount, display_amount, description, is_bonus_bet, status = 'pending' } = betData;
    
    // Validate required fields
    if (!account_key || amount === undefined) {
      throw new Error(`Missing required fields at index ${index}`);
    }
    
    // Validate account
    const account = await AccountModel.findByUserAndKey(userId, account_key);
    if (!account) {
      throw new Error(`Account '${account_key}' not found at index ${index}`);
    }
    
    // Validate amounts
    const betAmount = parseFloat(amount);
    const betDisplayAmount = parseFloat(display_amount || amount);
    
    if (isNaN(betAmount) || betAmount < 0) {
      throw new Error(`Invalid bet amount at index ${index}`);
    }
    
    if (isNaN(betDisplayAmount) || betDisplayAmount < 0) {
      throw new Error(`Invalid display amount at index ${index}`);
    }
    
    // Validate status
    if (!['pending', 'won', 'lost'].includes(status)) {
      throw new Error(`Invalid bet status at index ${index}`);
    }
    
    return {
      account_id: account.id,
      account_key,
      amount: is_bonus_bet ? 0 : betAmount,
      display_amount: betDisplayAmount,
      description: description || '',
      bet_date: new Date(),
      is_bonus_bet: Boolean(is_bonus_bet),
      status
    };
  }
  
  /**
   * Update account balances for bulk bets
   */
  async updateAccountBalancesForBulkBets(bets) {
    // Group bets by account
    const accountUpdates = {};
    
    bets.forEach(bet => {
      const accountId = bet.account_id;
      if (!accountUpdates[accountId]) {
        accountUpdates[accountId] = 0;
      }
      
      // Only subtract balance for non-bonus bets
      if (!bet.is_bonus_bet && bet.amount > 0) {
        accountUpdates[accountId] -= bet.amount;
      }
    });
    
    // Update each account
    for (const [accountId, balanceChange] of Object.entries(accountUpdates)) {
      if (balanceChange !== 0) {
        await AccountModel.updateBalance(parseInt(accountId), balanceChange);
      }
    }
  }
  
  /**
   * Analyze monthly betting data
   */
  analyzeMonthlyBettingData(monthlyData) {
    const analytics = {
      totalDays: Object.keys(monthlyData).length,
      averageDailyBets: 0,
      peakBettingDays: [],
      quietDays: [],
      winRateByDay: {},
      profitByDay: {}
    };
    
    let totalBets = 0;
    const dailyBetCounts = [];
    
    // Analyze each day
    Object.entries(monthlyData).forEach(([day, dayData]) => {
      let dayBets = 0;
      let dayWins = 0;
      let dayProfit = 0;
      
      Object.entries(dayData).forEach(([status, statusData]) => {
        dayBets += statusData.count;
        
        if (status === 'won') {
          dayWins += statusData.count;
          dayProfit += (statusData.totalWinnings - statusData.totalAmount);
        } else if (status === 'lost') {
          dayProfit -= statusData.totalAmount;
        }
      });
      
      dailyBetCounts.push(dayBets);
      totalBets += dayBets;
      
      // Calculate daily win rate
      const settledBets = (dayData.won?.count || 0) + (dayData.lost?.count || 0);
      analytics.winRateByDay[day] = settledBets > 0 ? (dayWins / settledBets) * 100 : 0;
      analytics.profitByDay[day] = dayProfit;
      
      // Identify peak and quiet days
      if (dayBets >= 3) {
        analytics.peakBettingDays.push({ day: parseInt(day), count: dayBets });
      } else if (dayBets === 0) {
        analytics.quietDays.push(parseInt(day));
      }
    });
    
    analytics.averageDailyBets = analytics.totalDays > 0 ? totalBets / analytics.totalDays : 0;
    
    // Sort peak days by activity
    analytics.peakBettingDays.sort((a, b) => b.count - a.count);
    
    return analytics;
  }
  
  /**
   * Get bet performance trends
   */
  async getBetPerformanceTrends(userId, days = 30) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const result = await BetModel.findByUserId(userId, {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        limit: 1000
      });
      
      const trends = this.calculateBetTrends(result.bets || [], days);
      
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
      throw new AppError('Failed to calculate bet performance trends', 500, 'BET_TRENDS_FAILED');
    }
  }
  
  /**
   * Calculate daily bet trends
   */
  calculateBetTrends(bets, days) {
    const trends = [];
    const endDate = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      // Filter bets for this date
      const dayBets = bets.filter(bet => bet.date === dateString);
      
      // Calculate daily metrics
      const totalBets = dayBets.length;
      const wonBets = dayBets.filter(bet => bet.status === 'won').length;
      const lostBets = dayBets.filter(bet => bet.status === 'lost').length;
      const settledBets = wonBets + lostBets;
      
      const totalWagered = dayBets.reduce((sum, bet) => sum + bet.amount, 0);
      const totalWinnings = dayBets
        .filter(bet => bet.status === 'won')
        .reduce((sum, bet) => sum + bet.winnings, 0);
      
      const netProfit = totalWinnings - totalWagered;
      const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;
      
      trends.push({
        date: dateString,
        totalBets,
        wonBets,
        lostBets,
        settledBets,
        totalWagered,
        totalWinnings,
        netProfit,
        winRate,
        avgBetSize: totalBets > 0 ? totalWagered / totalBets : 0
      });
    }
    
    return trends;
  }
  
  /**
   * Export bets to CSV format
   */
  formatBetsForExport(bets) {
    return bets.map(bet => ({
      Date: bet.date,
      Account: bet.accountName,
      Amount: bet.displayAmount,
      'Real Risk': bet.amount,
      Description: bet.description,
      Status: bet.status,
      Winnings: bet.winnings || 0,
      'Profit/Loss': this.calculateBetProfitLoss(bet).amount,
      'Bonus Bet': bet.isBonusBet ? 'Yes' : 'No',
      'Risk Level': this.assessBetRisk(bet)
    }));
  }
}

module.exports = new BetService();