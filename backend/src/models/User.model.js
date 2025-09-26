const { pool } = require('../config/database.config');
const bcrypt = require('bcrypt');
const appConfig = require('../config/app.config');

class UserModel {
  constructor() {
    this.tableName = 'users';
  }

  /**
   * Create a new user
   */
  async create(userData) {
    const { email, username, password } = userData;
    const hashedPassword = await bcrypt.hash(password, appConfig.bcrypt.saltRounds);
    
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (email, username, password_hash) VALUES (?, ?, ?)`,
        [email.toLowerCase(), username, hashedPassword]
      );
      
      const userId = result.insertId;
      
      // Create default accounts for the user
      const defaultAccounts = [
        ['draftkings1', 'DraftKings #1'],
        ['draftkings2', 'DraftKings #2'],
        ['fanduel', 'FanDuel'],
        ['betmgm', 'BetMGM'],
        ['bet365', 'Bet365']
      ];
      
      for (const [key, name] of defaultAccounts) {
        await connection.execute(
          'INSERT INTO accounts (user_id, account_key, name) VALUES (?, ?, ?)',
          [userId, key, name]
        );
      }
      
      await connection.commit();
      
      return await this.findById(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by ID
   */
  async findById(id) {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(
        `SELECT id, email, username, created_at, updated_at FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email) {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(
        `SELECT id, email, username, password_hash, created_at, updated_at FROM ${this.tableName} WHERE email = ?`,
        [email.toLowerCase()]
      );
      
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by username
   */
  async findByUsername(username) {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(
        `SELECT id, email, username, created_at, updated_at FROM ${this.tableName} WHERE username = ?`,
        [username]
      );
      
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Find user by email or username
   */
  async findByEmailOrUsername(identifier) {
    const connection = await pool.getConnection();
    
    try {
      const [users] = await connection.execute(
        `SELECT id, email, username, password_hash, created_at, updated_at 
         FROM ${this.tableName} 
         WHERE email = ? OR username = ?`,
        [identifier.toLowerCase(), identifier]
      );
      
      return users[0] || null;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user information
   */
  async update(id, updateData) {
    const connection = await pool.getConnection();
    
    try {
      const allowedFields = ['email', 'username'];
      const updateFields = [];
      const updateValues = [];
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = ?`);
          updateValues.push(key === 'email' ? updateData[key].toLowerCase() : updateData[key]);
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
   * Update user password
   */
  async updatePassword(id, currentPassword, newPassword) {
    const connection = await pool.getConnection();
    
    try {
      // First, verify current password
      const [users] = await connection.execute(
        `SELECT password_hash FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      if (users.length === 0) {
        throw new Error('User not found');
      }
      
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, users[0].password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, appConfig.bcrypt.saltRounds);
      
      // Update password
      const [result] = await connection.execute(
        `UPDATE ${this.tableName} SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [hashedNewPassword, id]
      );
      
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  /**
   * Verify user password
   */
  async verifyPassword(email, password) {
    const user = await this.findByEmail(email);
    if (!user || !user.password_hash) {
      return null;
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }
    
    // Return user without password hash
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Delete user and all associated data
   */
  async delete(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get user's accounts first
      const [accounts] = await connection.execute(
        'SELECT id FROM accounts WHERE user_id = ?',
        [id]
      );
      
      if (accounts.length > 0) {
        const accountIds = accounts.map(acc => acc.id);
        const placeholders = accountIds.map(() => '?').join(',');
        
        // Delete transactions and bets
        await connection.execute(
          `DELETE FROM transactions WHERE account_id IN (${placeholders})`,
          accountIds
        );
        
        await connection.execute(
          `DELETE FROM bets WHERE account_id IN (${placeholders})`,
          accountIds
        );
        
        // Delete accounts
        await connection.execute(
          'DELETE FROM accounts WHERE user_id = ?',
          [id]
        );
      }
      
      // Delete user
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
   * Get user statistics
   */
  async getStats(id) {
    const connection = await pool.getConnection();
    
    try {
      const [accountStats] = await connection.execute(`
        SELECT 
          COUNT(a.id) as total_accounts,
          SUM(a.balance) as total_balance,
          SUM(a.total_deposits) as total_deposits,
          SUM(a.total_withdrawals) as total_withdrawals
        FROM accounts a
        WHERE a.user_id = ?
      `, [id]);
      
      const [transactionStats] = await connection.execute(`
        SELECT 
          COUNT(t.id) as total_transactions,
          t.type,
          SUM(t.amount) as total_amount
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ?
        GROUP BY t.type
      `, [id]);
      
      const [betStats] = await connection.execute(`
        SELECT 
          COUNT(b.id) as total_bets,
          b.status,
          COUNT(CASE WHEN b.status = 'won' THEN 1 END) as won_bets,
          COUNT(CASE WHEN b.status = 'lost' THEN 1 END) as lost_bets,
          COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bets,
          SUM(b.amount) as total_wagered,
          SUM(CASE WHEN b.status = 'won' THEN b.winnings ELSE 0 END) as total_winnings
        FROM bets b
        JOIN accounts a ON b.account_id = a.id
        WHERE a.user_id = ?
      `, [id]);
      
      // Process transaction stats
      const transactionsByType = {};
      transactionStats.forEach(stat => {
        transactionsByType[stat.type] = {
          count: stat.total_transactions,
          total: parseFloat(stat.total_amount)
        };
      });
      
      const stats = betStats[0];
      
      return {
        accounts: {
          total: accountStats[0].total_accounts,
          totalBalance: parseFloat(accountStats[0].total_balance || 0),
          totalDeposits: parseFloat(accountStats[0].total_deposits || 0),
          totalWithdrawals: parseFloat(accountStats[0].total_withdrawals || 0)
        },
        transactions: transactionsByType,
        bets: {
          total: stats.total_bets,
          won: stats.won_bets,
          lost: stats.lost_bets,
          pending: stats.pending_bets,
          totalWagered: parseFloat(stats.total_wagered || 0),
          totalWinnings: parseFloat(stats.total_winnings || 0),
          winRate: stats.total_bets > 0 ? ((stats.won_bets / (stats.won_bets + stats.lost_bets)) * 100) : 0
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email, excludeId = null) {
    const connection = await pool.getConnection();
    
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE email = ?`;
      const params = [email.toLowerCase()];
      
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
   * Check if username exists
   */
  async usernameExists(username, excludeId = null) {
    const connection = await pool.getConnection();
    
    try {
      let query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE username = ?`;
      const params = [username];
      
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
   * Get all users (admin function)
   */
  async findAll(options = {}) {
    const { page = 1, limit = 50, search = '' } = options;
    const offset = (page - 1) * limit;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT id, email, username, created_at, updated_at 
        FROM ${this.tableName}
      `;
      const params = [];
      
      if (search) {
        query += ' WHERE email LIKE ? OR username LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [users] = await connection.execute(query, params);
      
      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName}`;
      const countParams = [];
      
      if (search) {
        countQuery += ' WHERE email LIKE ? OR username LIKE ?';
        countParams.push(`%${search}%`, `%${search}%`);
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      
      return {
        users,
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
   * Update last login time
   */
  async updateLastLogin(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        `UPDATE ${this.tableName} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );
      
      return true;
    } catch (error) {
      console.error('Error updating last login:', error);
      return false;
    } finally {
      connection.release();
    }
  }
}

module.exports = new UserModel();