const { pool } = require('../config/database.config');

class AccountModel {
  constructor() {
    this.tableName = 'accounts';
  }

  /**
   * Create a new account for a user
   */
  async create(userId, accountData) {
    const { account_key, name, balance = 0 } = accountData;
    
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (user_id, account_key, name, balance) VALUES (?, ?, ?, ?)`,
        [userId, account_key, name, balance]
      );
      
      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * Find account by ID
   */
  async findById(id) {
    const connection = await pool.getConnection();
    
    try {
      const [accounts] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      if (accounts.length === 0) {
        return null;
      }
      
      return this.formatAccount(accounts[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Find account by user ID and account key
   */
  async findByUserAndKey(userId, accountKey) {
    const connection = await pool.getConnection();
    
    try {
      const [accounts] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE user_id = ? AND account_key = ?`,
        [userId, accountKey]
      );
      
      if (accounts.length === 0) {
        return null;
      }
      
      return this.formatAccount(accounts[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Get all accounts for a user with their data
   */
  async findByUserId(userId) {
    const connection = await pool.getConnection();
    
    try {
      // Get accounts
      const [accounts] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE user_id = ? ORDER BY name`,
        [userId]
      );
      
      const accountsData = {};
      
      for (const account of accounts) {
        // Get transactions for this account
        const [transactions] = await connection.execute(
          `SELECT * FROM transactions WHERE account_id = ? ORDER BY transaction_date DESC, created_at DESC`,
          [account.id]
        );
        
        // Get bets for this account
        const [bets] = await connection.execute(
          `SELECT * FROM bets WHERE account_id = ? ORDER BY bet_date DESC, created_at DESC`,
          [account.id]
        );
        
        accountsData[account.account_key] = {
          id: account.id,
          name: account.name,
          balance: parseFloat(account.balance),
          totalDeposits: parseFloat(account.total_deposits),
          totalWithdrawals: parseFloat(account.total_withdrawals),
          createdAt: account.created_at,
          updatedAt: account.updated_at,
          transactions: transactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: parseFloat(t.amount),
            description: t.description,
            date: t.transaction_date.toISOString().split('T')[0],
            createdAt: t.created_at,
            updatedAt: t.updated_at
          })),
          bets: bets.map(b => ({
            id: b.id,
            amount: parseFloat(b.amount),
            displayAmount: parseFloat(b.display_amount),
            description: b.description,
            date: b.bet_date.toISOString().split('T')[0],
            status: b.status,
            winnings: parseFloat(b.winnings),
            isBonusBet: Boolean(b.is_bonus_bet),
            createdAt: b.created_at,
            updatedAt: b.updated_at
          }))
        };
      }
      
      return accountsData;
    } finally {
      connection.release();
    }
  }

  /**
   * Update account information
   */
  async update(id, updateData) {
    const connection = await pool.getConnection();
    
    try {
      const allowedFields = ['name', 'balance'];
      const updateFields = [];
      const updateValues = [];
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
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
   * Update account balance
   */
  async updateBalance(id, balanceChange) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `UPDATE ${this.tableName} SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [balanceChange, id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Update deposit and withdrawal totals
   */
  async updateTotals(id, depositChange = 0, withdrawalChange = 0, balanceChange = 0) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `UPDATE ${this.tableName} 
         SET balance = balance + ?, 
             total_deposits = total_deposits + ?, 
             total_withdrawals = total_withdrawals + ?,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [balanceChange, depositChange, withdrawalChange, id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Clear account data (reset balance and totals, delete transactions and bets)
   */
  async clearData(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete transactions and bets
      await connection.execute('DELETE FROM transactions WHERE account_id = ?', [id]);
      await connection.execute('DELETE FROM bets WHERE account_id = ?', [id]);
      
      // Reset account balances
      await connection.execute(
        `UPDATE ${this.tableName} 
         SET balance = 0, total_deposits = 0, total_withdrawals = 0, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [id]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete account and all associated data
   */
  async delete(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Delete transactions and bets first (foreign key constraints)
      await connection.execute('DELETE FROM transactions WHERE account_id = ?', [id]);
      await connection.execute('DELETE FROM bets WHERE account_id = ?', [id]);
      
      // Delete account
      const [result] = await connection.execute(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get account statistics
   */
  async getStats(id) {
    const connection = await pool.getConnection();
    
    try {
      const [accountData] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      if (accountData.length === 0) {
        return null;
      }
      
      const account = accountData[0];
      
      // Get transaction statistics
      const [transactionStats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_transactions,
          t.type,
          SUM(t.amount) as total_amount,
          AVG(t.amount) as avg_amount
        FROM transactions t
        WHERE t.account_id = ?
        GROUP BY t.type
      `, [id]);
      
      // Get bet statistics
      const [betStats] = await connection.execute(`
        SELECT 
          COUNT(*) as total_bets,
          COUNT(CASE WHEN status = 'won' THEN 1 END) as won_bets,
          COUNT(CASE WHEN status = 'lost' THEN 1 END) as lost_bets,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bets,
          SUM(amount) as total_wagered,
          SUM(CASE WHEN status = 'won' THEN winnings ELSE 0 END) as total_winnings,
          AVG(amount) as avg_bet_size,
          MAX(amount) as largest_bet,
          MAX(CASE WHEN status = 'won' THEN winnings ELSE 0 END) as largest_win
        FROM bets
        WHERE account_id = ?
      `, [id]);
      
      const bets = betStats[0];
      const settledBets = bets.won_bets + bets.lost_bets;
      
      // Process transaction stats
      const transactionsByType = {};
      transactionStats.forEach(stat => {
        transactionsByType[stat.type] = {
          count: stat.total_transactions,
          total: parseFloat(stat.total_amount || 0),
          average: parseFloat(stat.avg_amount || 0)
        };
      });
      
      return {
        account: {
          id: account.id,
          name: account.name,
          accountKey: account.account_key,
          balance: parseFloat(account.balance),
          totalDeposits: parseFloat(account.total_deposits),
          totalWithdrawals: parseFloat(account.total_withdrawals),
          netDeposits: parseFloat(account.total_deposits) - parseFloat(account.total_withdrawals)
        },
        transactions: transactionsByType,
        betting: {
          totalBets: bets.total_bets,
          settledBets,
          wonBets: bets.won_bets,
          lostBets: bets.lost_bets,
          pendingBets: bets.pending_bets,
          winRate: settledBets > 0 ? ((bets.won_bets / settledBets) * 100).toFixed(2) : 0,
          totalWagered: parseFloat(bets.total_wagered || 0),
          totalWinnings: parseFloat(bets.total_winnings || 0),
          netProfit: parseFloat(bets.total_winnings || 0) - parseFloat(bets.total_wagered || 0),
          avgBetSize: parseFloat(bets.avg_bet_size || 0),
          largestBet: parseFloat(bets.largest_bet || 0),
          largestWin: parseFloat(bets.largest_win || 0),
          roi: bets.total_wagered > 0 ? 
            (((parseFloat(bets.total_winnings || 0) - parseFloat(bets.total_wagered || 0)) / parseFloat(bets.total_wagered)) * 100).toFixed(2) : 0
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Check if account key exists for user
   */
  async keyExists(userId, accountKey, excludeId = null) {
    const connection = await pool.getConnection();
    
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE user_id = ? AND account_key = ?`;
      const params = [userId, accountKey];
      
      if (excludeId) {
        query += ' AND id != ?';
        params.push(excludeId);
      }
      
      const [result] = await connection.execute(query, params);
      return result[0].count > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Get account summary for dashboard
   */
  async getSummary(userId) {
    const connection = await pool.getConnection();
    
    try {
      const [summary] = await connection.execute(`
        SELECT 
          COUNT(*) as total_accounts,
          SUM(balance) as total_balance,
          SUM(total_deposits) as total_deposits,
          SUM(total_withdrawals) as total_withdrawals
        FROM ${this.tableName}
        WHERE user_id = ?
      `, [userId]);
      
      const result = summary[0];
      
      return {
        totalAccounts: result.total_accounts,
        totalBalance: parseFloat(result.total_balance || 0),
        totalDeposits: parseFloat(result.total_deposits || 0),
        totalWithdrawals: parseFloat(result.total_withdrawals || 0),
        netDeposits: parseFloat(result.total_deposits || 0) - parseFloat(result.total_withdrawals || 0)
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get recent account activity
   */
  async getRecentActivity(userId, limit = 10) {
    const connection = await pool.getConnection();
    
    try {
      const [activity] = await connection.execute(`
        SELECT 
          'transaction' as type,
          t.id,
          t.type as action,
          t.amount,
          t.description,
          t.transaction_date as date,
          t.created_at,
          a.name as account_name,
          a.account_key
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ?
        
        UNION ALL
        
        SELECT 
          'bet' as type,
          b.id,
          b.status as action,
          b.display_amount as amount,
          b.description,
          b.bet_date as date,
          b.created_at,
          a.name as account_name,
          a.account_key
        FROM bets b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ?
        
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, userId, limit]);
      
      return activity.map(item => ({
        type: item.type,
        id: item.id,
        action: item.action,
        amount: parseFloat(item.amount),
        description: item.description,
        date: item.date instanceof Date ? item.date.toISOString().split('T')[0] : item.date,
        createdAt: item.created_at,
        accountName: item.account_name,
        accountKey: item.account_key
      }));
    } finally {
      connection.release();
    }
  }

  /**
   * Format account data
   */
  formatAccount(account) {
    return {
      id: account.id,
      userId: account.user_id,
      accountKey: account.account_key,
      name: account.name,
      balance: parseFloat(account.balance),
      totalDeposits: parseFloat(account.total_deposits),
      totalWithdrawals: parseFloat(account.total_withdrawals),
      createdAt: account.created_at,
      updatedAt: account.updated_at
    };
  }

  /**
   * Recalculate account totals from transactions and bets
   */
  async recalculateBalance(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get all transactions for this account
      const [transactions] = await connection.execute(
        'SELECT type, amount FROM transactions WHERE account_id = ?',
        [id]
      );
      
      // Get all bets for this account
      const [bets] = await connection.execute(
        'SELECT amount, status, winnings, is_bonus_bet FROM bets WHERE account_id = ?',
        [id]
      );
      
      let balance = 0;
      let totalDeposits = 0;
      let totalWithdrawals = 0;
      
      // Calculate from transactions
      transactions.forEach(transaction => {
        const amount = parseFloat(transaction.amount);
        
        switch (transaction.type) {
          case 'deposit':
            balance += amount;
            totalDeposits += amount;
            break;
          case 'withdrawal':
            balance -= amount;
            totalWithdrawals += amount;
            break;
          case 'bonus-credit':
          case 'historical-win':
            balance += amount;
            break;
          case 'historical-loss':
            balance -= amount;
            break;
          case 'bet':
            // Bet amounts are handled in the bets table
            break;
        }
      });
      
      // Calculate from bets
      bets.forEach(bet => {
        const amount = parseFloat(bet.amount);
        const winnings = parseFloat(bet.winnings || 0);
        const isBonusBet = Boolean(bet.is_bonus_bet);
        
        if (!isBonusBet) {
          // Regular bets reduce balance when placed
          balance -= amount;
        }
        
        if (bet.status === 'won') {
          // Add winnings back to balance
          balance += winnings;
        }
      });
      
      // Update account with calculated values
      await connection.execute(
        `UPDATE ${this.tableName} 
         SET balance = ?, total_deposits = ?, total_withdrawals = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [balance, totalDeposits, totalWithdrawals, id]
      );
      
      await connection.commit();
      
      return {
        balance,
        totalDeposits,
        totalWithdrawals
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AccountModel();