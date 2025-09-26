const { pool } = require('../config/database.config');

class BetModel {
  constructor() {
    this.tableName = 'bets';
    this.validStatuses = ['pending', 'won', 'lost'];
  }

  /**
   * Create a new bet
   */
  async create(betData) {
    const { account_id, amount, display_amount, description, bet_date, is_bonus_bet = false } = betData;
    
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (account_id, amount, display_amount, description, bet_date, is_bonus_bet, status) 
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [account_id, amount, display_amount || amount, description || '', bet_date || new Date(), is_bonus_bet]
      );
      
      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * Find bet by ID
   */
  async findById(id) {
    const connection = await pool.getConnection();
    
    try {
      const [bets] = await connection.execute(
        `SELECT b.*, a.account_key, a.name as account_name, a.user_id
         FROM ${this.tableName} b
         JOIN accounts a ON b.account_id = a.id
         WHERE b.id = ?`,
        [id]
      );
      
      if (bets.length === 0) {
        return null;
      }
      
      return this.formatBet(bets[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Find bets by account ID
   */
  async findByAccountId(accountId, options = {}) {
    const { page = 1, limit = 50, status, startDate, endDate } = options;
    const offset = (page - 1) * limit;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE account_id = ?`;
      const params = [accountId];
      
      if (status) {
        query += ' AND status = ?';
        params.push(status);
      }
      
      if (startDate) {
        query += ' AND bet_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND bet_date <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY bet_date DESC, created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [bets] = await connection.execute(query, params);
      
      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE account_id = ?`;
      const countParams = [accountId];
      
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      
      if (startDate) {
        countQuery += ' AND bet_date >= ?';
        countParams.push(startDate);
      }
      
      if (endDate) {
        countQuery += ' AND bet_date <= ?';
        countParams.push(endDate);
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      
      return {
        bets: bets.map(b => this.formatBet(b)),
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Find bets by user ID
   */
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 50, status, accountKey, startDate, endDate } = options;
    const offset = (page - 1) * limit;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT b.*, a.account_key, a.name as account_name, a.user_id
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ?
      `;
      const params = [userId];
      
      if (accountKey) {
        query += ' AND a.account_key = ?';
        params.push(accountKey);
      }
      
      if (status) {
        query += ' AND b.status = ?';
        params.push(status);
      }
      
      if (startDate) {
        query += ' AND b.bet_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND b.bet_date <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY b.bet_date DESC, b.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [bets] = await connection.execute(query, params);
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ?
      `;
      const countParams = [userId];
      
      if (accountKey) {
        countQuery += ' AND a.account_key = ?';
        countParams.push(accountKey);
      }
      
      if (status) {
        countQuery += ' AND b.status = ?';
        countParams.push(status);
      }
      
      if (startDate) {
        countQuery += ' AND b.bet_date >= ?';
        countParams.push(startDate);
      }
      
      if (endDate) {
        countQuery += ' AND b.bet_date <= ?';
        countParams.push(endDate);
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      
      return {
        bets: bets.map(b => this.formatBet(b)),
        pagination: {
          page,
          limit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / limit)
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Update bet status and winnings
   */
  async updateStatus(id, status, winnings = 0) {
    if (!this.validStatuses.includes(status)) {
      throw new Error(`Invalid bet status: ${status}`);
    }
    
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `UPDATE ${this.tableName} 
         SET status = ?, winnings = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [status, winnings, id]
      );
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Update bet information
   */
  async update(id, updateData) {
    const connection = await pool.getConnection();
    
    try {
      const allowedFields = ['amount', 'display_amount', 'description', 'bet_date', 'status', 'winnings', 'is_bonus_bet'];
      const updateFields = [];
      const updateValues = [];
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          if (key === 'status' && !this.validStatuses.includes(updateData[key])) {
            throw new Error(`Invalid bet status: ${updateData[key]}`);
          }
          updateFields.push(`${key} = ?`);
          updateValues.push(updateData[key]);
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      updateValues.push(id);
      
      const [result] = await connection.execute(
        `UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      if (result.affectedRows === 0) {
        return null;
      }
      
      return await this.findById(id);
    } finally {
      connection.release();
    }
  }

  /**
   * Delete bet
   */
  async delete(id) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get bet statistics for an account
   */
  async getStatsByAccountId(accountId, options = {}) {
    const { startDate, endDate } = options;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          status,
          is_bonus_bet,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          SUM(display_amount) as total_display_amount,
          SUM(winnings) as total_winnings,
          AVG(amount) as avg_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount,
          MAX(winnings) as max_winnings
        FROM ${this.tableName}
        WHERE account_id = ?
      `;
      const params = [accountId];
      
      if (startDate) {
        query += ' AND bet_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND bet_date <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY status, is_bonus_bet ORDER BY status, is_bonus_bet';
      
      const [stats] = await connection.execute(query, params);
      
      let totalBets = 0;
      let totalWagered = 0;
      let totalWinnings = 0;
      let wonBets = 0;
      let lostBets = 0;
      let pendingBets = 0;
      let bonusBets = 0;
      
      const detailedStats = {};
      
      stats.forEach(stat => {
        const key = `${stat.status}_${stat.is_bonus_bet ? 'bonus' : 'regular'}`;
        const amount = parseFloat(stat.total_amount || 0);
        const winnings = parseFloat(stat.total_winnings || 0);
        
        detailedStats[key] = {
          count: stat.count,
          totalAmount: amount,
          totalDisplayAmount: parseFloat(stat.total_display_amount || 0),
          totalWinnings: winnings,
          avgAmount: parseFloat(stat.avg_amount || 0),
          minAmount: parseFloat(stat.min_amount || 0),
          maxAmount: parseFloat(stat.max_amount || 0),
          maxWinnings: parseFloat(stat.max_winnings || 0)
        };
        
        totalBets += stat.count;
        totalWagered += amount;
        totalWinnings += winnings;
        
        if (stat.status === 'won') wonBets += stat.count;
        if (stat.status === 'lost') lostBets += stat.count;
        if (stat.status === 'pending') pendingBets += stat.count;
        if (stat.is_bonus_bet) bonusBets += stat.count;
      });
      
      const settledBets = wonBets + lostBets;
      const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;
      const netProfit = totalWinnings - totalWagered;
      const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
      
      return {
        detailed: detailedStats,
        summary: {
          totalBets,
          settledBets,
          wonBets,
          lostBets,
          pendingBets,
          bonusBets,
          regularBets: totalBets - bonusBets,
          winRate: parseFloat(winRate.toFixed(2)),
          totalWagered,
          totalWinnings,
          netProfit,
          roi: parseFloat(roi.toFixed(2)),
          avgBetSize: totalBets > 0 ? totalWagered / totalBets : 0
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get bet statistics for a user
   */
  async getStatsByUserId(userId, options = {}) {
    const { startDate, endDate, accountKey } = options;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          b.status,
          b.is_bonus_bet,
          COUNT(*) as count,
          SUM(b.amount) as total_amount,
          SUM(b.display_amount) as total_display_amount,
          SUM(b.winnings) as total_winnings,
          AVG(b.amount) as avg_amount,
          MIN(b.amount) as min_amount,
          MAX(b.amount) as max_amount,
          MAX(b.winnings) as max_winnings
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ?
      `;
      const params = [userId];
      
      if (accountKey) {
        query += ' AND a.account_key = ?';
        params.push(accountKey);
      }
      
      if (startDate) {
        query += ' AND b.bet_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND b.bet_date <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY b.status, b.is_bonus_bet ORDER BY b.status, b.is_bonus_bet';
      
      const [stats] = await connection.execute(query, params);
      
      let totalBets = 0;
      let totalWagered = 0;
      let totalWinnings = 0;
      let wonBets = 0;
      let lostBets = 0;
      let pendingBets = 0;
      let bonusBets = 0;
      
      const detailedStats = {};
      
      stats.forEach(stat => {
        const key = `${stat.status}_${stat.is_bonus_bet ? 'bonus' : 'regular'}`;
        const amount = parseFloat(stat.total_amount || 0);
        const winnings = parseFloat(stat.total_winnings || 0);
        
        detailedStats[key] = {
          count: stat.count,
          totalAmount: amount,
          totalDisplayAmount: parseFloat(stat.total_display_amount || 0),
          totalWinnings: winnings,
          avgAmount: parseFloat(stat.avg_amount || 0),
          minAmount: parseFloat(stat.min_amount || 0),
          maxAmount: parseFloat(stat.max_amount || 0),
          maxWinnings: parseFloat(stat.max_winnings || 0)
        };
        
        totalBets += stat.count;
        totalWagered += amount;
        totalWinnings += winnings;
        
        if (stat.status === 'won') wonBets += stat.count;
        if (stat.status === 'lost') lostBets += stat.count;
        if (stat.status === 'pending') pendingBets += stat.count;
        if (stat.is_bonus_bet) bonusBets += stat.count;
      });
      
      const settledBets = wonBets + lostBets;
      const winRate = settledBets > 0 ? (wonBets / settledBets) * 100 : 0;
      const netProfit = totalWinnings - totalWagered;
      const roi = totalWagered > 0 ? (netProfit / totalWagered) * 100 : 0;
      
      return {
        detailed: detailedStats,
        summary: {
          totalBets,
          settledBets,
          wonBets,
          lostBets,
          pendingBets,
          bonusBets,
          regularBets: totalBets - bonusBets,
          winRate: parseFloat(winRate.toFixed(2)),
          totalWagered,
          totalWinnings,
          netProfit,
          roi: parseFloat(roi.toFixed(2)),
          avgBetSize: totalBets > 0 ? totalWagered / totalBets : 0
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get recent bets
   */
  async getRecent(userId, limit = 10) {
    const connection = await pool.getConnection();
    
    try {
      const [bets] = await connection.execute(`
        SELECT b.*, a.account_key, a.name as account_name, a.user_id
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ?
        ORDER BY b.created_at DESC
        LIMIT ?
      `, [userId, limit]);
      
      return bets.map(b => this.formatBet(b));
    } finally {
      connection.release();
    }
  }

  /**
   * Get pending bets for a user
   */
  async getPendingByUserId(userId) {
    const connection = await pool.getConnection();
    
    try {
      const [bets] = await connection.execute(`
        SELECT b.*, a.account_key, a.name as account_name, a.user_id
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ? AND b.status = 'pending'
        ORDER BY b.bet_date DESC, b.created_at DESC
      `, [userId]);
      
      return bets.map(b => this.formatBet(b));
    } finally {
      connection.release();
    }
  }

  /**
   * Get betting streak information
   */
  async getStreakInfo(userId, accountKey = null) {
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT b.status, b.bet_date
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ? AND b.status IN ('won', 'lost')
      `;
      const params = [userId];
      
      if (accountKey) {
        query += ' AND a.account_key = ?';
        params.push(accountKey);
      }
      
      query += ' ORDER BY b.bet_date DESC, b.created_at DESC';
      
      const [bets] = await connection.execute(query, params);
      
      if (bets.length === 0) {
        return {
          currentStreak: 0,
          currentStreakType: null,
          longestWinStreak: 0,
          longestLoseStreak: 0
        };
      }
      
      let currentStreak = 0;
      let currentStreakType = null;
      let longestWinStreak = 0;
      let longestLoseStreak = 0;
      let tempWinStreak = 0;
      let tempLoseStreak = 0;
      
      // Calculate current streak
      const lastStatus = bets[0].status;
      currentStreakType = lastStatus;
      
      for (const bet of bets) {
        if (bet.status === lastStatus) {
          currentStreak++;
        } else {
          break;
        }
      }
      
      // Calculate longest streaks
      let currentWinStreak = 0;
      let currentLoseStreak = 0;
      
      for (const bet of bets.reverse()) { // Process chronologically
        if (bet.status === 'won') {
          currentWinStreak++;
          if (currentLoseStreak > longestLoseStreak) {
            longestLoseStreak = currentLoseStreak;
          }
          currentLoseStreak = 0;
        } else if (bet.status === 'lost') {
          currentLoseStreak++;
          if (currentWinStreak > longestWinStreak) {
            longestWinStreak = currentWinStreak;
          }
          currentWinStreak = 0;
        }
      }
      
      // Check final streaks
      if (currentWinStreak > longestWinStreak) {
        longestWinStreak = currentWinStreak;
      }
      if (currentLoseStreak > longestLoseStreak) {
        longestLoseStreak = currentLoseStreak;
      }
      
      return {
        currentStreak,
        currentStreakType,
        longestWinStreak,
        longestLoseStreak
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get monthly betting summary
   */
  async getMonthlySummary(userId, year, month) {
    const connection = await pool.getConnection();
    
    try {
      const [summary] = await connection.execute(`
        SELECT 
          b.status,
          COUNT(*) as count,
          SUM(b.amount) as total_amount,
          SUM(b.winnings) as total_winnings,
          DAY(b.bet_date) as day
        FROM ${this.tableName} b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ? 
          AND YEAR(b.bet_date) = ? 
          AND MONTH(b.bet_date) = ?
        GROUP BY b.status, DAY(b.bet_date)
        ORDER BY DAY(b.bet_date), b.status
      `, [userId, year, month]);
      
      // Organize data by day
      const dailyData = {};
      
      summary.forEach(row => {
        const day = row.day;
        if (!dailyData[day]) {
          dailyData[day] = {};
        }
        
        dailyData[day][row.status] = {
          count: row.count,
          totalAmount: parseFloat(row.total_amount || 0),
          totalWinnings: parseFloat(row.total_winnings || 0)
        };
      });
      
      return dailyData;
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk create bets
   */
  async bulkCreate(bets) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      
      for (const betData of bets) {
        const [result] = await connection.execute(
          `INSERT INTO ${this.tableName} (account_id, amount, display_amount, description, bet_date, is_bonus_bet, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            betData.account_id,
            betData.amount,
            betData.display_amount || betData.amount,
            betData.description || '',
            betData.bet_date || new Date(),
            betData.is_bonus_bet || false,
            betData.status || 'pending'
          ]
        );
        
        results.push({
          id: result.insertId,
          ...betData
        });
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete bets by account ID
   */
  async deleteByAccountId(accountId) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `DELETE FROM ${this.tableName} WHERE account_id = ?`,
        [accountId]
      );
      
      return result.affectedRows;
    } finally {
      connection.release();
    }
  }

  /**
   * Get bet profit/loss calculation
   */
  calculateProfitLoss(bet) {
    if (bet.status === 'won') {
      return parseFloat(bet.winnings || 0) - parseFloat(bet.amount || 0);
    } else if (bet.status === 'lost') {
      return -parseFloat(bet.amount || 0);
    }
    return 0; // Pending bets
  }

  /**
   * Format bet data
   */
  formatBet(bet) {
    return {
      id: bet.id,
      accountId: bet.account_id,
      accountKey: bet.account_key,
      accountName: bet.account_name,
      userId: bet.user_id,
      amount: parseFloat(bet.amount),
      displayAmount: parseFloat(bet.display_amount),
      description: bet.description,
      date: bet.bet_date instanceof Date ? 
        bet.bet_date.toISOString().split('T')[0] : 
        bet.bet_date,
      status: bet.status,
      winnings: parseFloat(bet.winnings || 0),
      isBonusBet: Boolean(bet.is_bonus_bet),
      createdAt: bet.created_at,
      updatedAt: bet.updated_at,
      profitLoss: this.calculateProfitLoss(bet)
    };
  }

  /**
   * Validate bet data
   */
  validateBetData(data) {
    const errors = [];
    
    if (!data.account_id) {
      errors.push('Account ID is required');
    }
    
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) < 0) {
      errors.push('Amount must be a non-negative number');
    }
    
    if (data.display_amount && (isNaN(data.display_amount) || parseFloat(data.display_amount) < 0)) {
      errors.push('Display amount must be a non-negative number');
    }
    
    if (data.status && !this.validStatuses.includes(data.status)) {
      errors.push(`Status must be one of: ${this.validStatuses.join(', ')}`);
    }
    
    if (data.winnings && (isNaN(data.winnings) || parseFloat(data.winnings) < 0)) {
      errors.push('Winnings must be a non-negative number');
    }
    
    if (data.bet_date && isNaN(Date.parse(data.bet_date))) {
      errors.push('Bet date must be a valid date');
    }
    
    return errors;
  }
}

module.exports = new BetModel();