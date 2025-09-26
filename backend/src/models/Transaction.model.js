const { pool } = require('../config/database.config');

class TransactionModel {
  constructor() {
    this.tableName = 'transactions';
    this.validTypes = ['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'];
  }

  /**
   * Create a new transaction
   */
  async create(transactionData) {
    const { account_id, type, amount, description, transaction_date } = transactionData;
    
    if (!this.validTypes.includes(type)) {
      throw new Error(`Invalid transaction type: ${type}`);
    }
    
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.execute(
        `INSERT INTO ${this.tableName} (account_id, type, amount, description, transaction_date) 
         VALUES (?, ?, ?, ?, ?)`,
        [account_id, type, amount, description || '', transaction_date || new Date()]
      );
      
      return await this.findById(result.insertId);
    } finally {
      connection.release();
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id) {
    const connection = await pool.getConnection();
    
    try {
      const [transactions] = await connection.execute(
        `SELECT t.*, a.account_key, a.name as account_name, a.user_id
         FROM ${this.tableName} t
         JOIN accounts a ON t.account_id = a.id
         WHERE t.id = ?`,
        [id]
      );
      
      if (transactions.length === 0) {
        return null;
      }
      
      return this.formatTransaction(transactions[0]);
    } finally {
      connection.release();
    }
  }

  /**
   * Find transactions by account ID
   */
  async findByAccountId(accountId, options = {}) {
    const { page = 1, limit = 50, type, startDate, endDate } = options;
    const offset = (page - 1) * limit;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `SELECT * FROM ${this.tableName} WHERE account_id = ?`;
      const params = [accountId];
      
      if (type) {
        query += ' AND type = ?';
        params.push(type);
      }
      
      if (startDate) {
        query += ' AND transaction_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND transaction_date <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY transaction_date DESC, created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [transactions] = await connection.execute(query, params);
      
      // Get total count for pagination
      let countQuery = `SELECT COUNT(*) as total FROM ${this.tableName} WHERE account_id = ?`;
      const countParams = [accountId];
      
      if (type) {
        countQuery += ' AND type = ?';
        countParams.push(type);
      }
      
      if (startDate) {
        countQuery += ' AND transaction_date >= ?';
        countParams.push(startDate);
      }
      
      if (endDate) {
        countQuery += ' AND transaction_date <= ?';
        countParams.push(endDate);
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      
      return {
        transactions: transactions.map(t => this.formatTransaction(t)),
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
   * Find transactions by user ID
   */
  async findByUserId(userId, options = {}) {
    const { page = 1, limit = 50, type, accountKey, startDate, endDate } = options;
    const offset = (page - 1) * limit;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT t.*, a.account_key, a.name as account_name, a.user_id
        FROM ${this.tableName} t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ?
      `;
      const params = [userId];
      
      if (accountKey) {
        query += ' AND a.account_key = ?';
        params.push(accountKey);
      }
      
      if (type) {
        query += ' AND t.type = ?';
        params.push(type);
      }
      
      if (startDate) {
        query += ' AND t.transaction_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND t.transaction_date <= ?';
        params.push(endDate);
      }
      
      query += ' ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [transactions] = await connection.execute(query, params);
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM ${this.tableName} t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ?
      `;
      const countParams = [userId];
      
      if (accountKey) {
        countQuery += ' AND a.account_key = ?';
        countParams.push(accountKey);
      }
      
      if (type) {
        countQuery += ' AND t.type = ?';
        countParams.push(type);
      }
      
      if (startDate) {
        countQuery += ' AND t.transaction_date >= ?';
        countParams.push(startDate);
      }
      
      if (endDate) {
        countQuery += ' AND t.transaction_date <= ?';
        countParams.push(endDate);
      }
      
      const [countResult] = await connection.execute(countQuery, countParams);
      
      return {
        transactions: transactions.map(t => this.formatTransaction(t)),
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
   * Update transaction
   */
  async update(id, updateData) {
    const connection = await pool.getConnection();
    
    try {
      const allowedFields = ['type', 'amount', 'description', 'transaction_date'];
      const updateFields = [];
      const updateValues = [];
      
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          if (key === 'type' && !this.validTypes.includes(updateData[key])) {
            throw new Error(`Invalid transaction type: ${updateData[key]}`);
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
   * Delete transaction
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
   * Get transaction statistics for an account
   */
  async getStatsByAccountId(accountId, options = {}) {
    const { startDate, endDate } = options;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          type,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount,
          MIN(amount) as min_amount,
          MAX(amount) as max_amount
        FROM ${this.tableName} 
        WHERE account_id = ?
      `;
      const params = [accountId];
      
      if (startDate) {
        query += ' AND transaction_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND transaction_date <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY type ORDER BY type';
      
      const [stats] = await connection.execute(query, params);
      
      const formattedStats = {};
      let totalTransactions = 0;
      let totalAmount = 0;
      
      stats.forEach(stat => {
        const amount = parseFloat(stat.total_amount || 0);
        totalTransactions += stat.count;
        totalAmount += amount;
        
        formattedStats[stat.type] = {
          count: stat.count,
          totalAmount: amount,
          avgAmount: parseFloat(stat.avg_amount || 0),
          minAmount: parseFloat(stat.min_amount || 0),
          maxAmount: parseFloat(stat.max_amount || 0)
        };
      });
      
      return {
        byType: formattedStats,
        overall: {
          totalTransactions,
          totalAmount,
          avgAmount: totalTransactions > 0 ? totalAmount / totalTransactions : 0
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get transaction statistics for a user
   */
  async getStatsByUserId(userId, options = {}) {
    const { startDate, endDate, accountKey } = options;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT 
          t.type,
          COUNT(*) as count,
          SUM(t.amount) as total_amount,
          AVG(t.amount) as avg_amount,
          MIN(t.amount) as min_amount,
          MAX(t.amount) as max_amount
        FROM ${this.tableName} t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ?
      `;
      const params = [userId];
      
      if (accountKey) {
        query += ' AND a.account_key = ?';
        params.push(accountKey);
      }
      
      if (startDate) {
        query += ' AND t.transaction_date >= ?';
        params.push(startDate);
      }
      
      if (endDate) {
        query += ' AND t.transaction_date <= ?';
        params.push(endDate);
      }
      
      query += ' GROUP BY t.type ORDER BY t.type';
      
      const [stats] = await connection.execute(query, params);
      
      const formattedStats = {};
      let totalTransactions = 0;
      let totalAmount = 0;
      
      stats.forEach(stat => {
        const amount = parseFloat(stat.total_amount || 0);
        totalTransactions += stat.count;
        totalAmount += amount;
        
        formattedStats[stat.type] = {
          count: stat.count,
          totalAmount: amount,
          avgAmount: parseFloat(stat.avg_amount || 0),
          minAmount: parseFloat(stat.min_amount || 0),
          maxAmount: parseFloat(stat.max_amount || 0)
        };
      });
      
      return {
        byType: formattedStats,
        overall: {
          totalTransactions,
          totalAmount,
          avgAmount: totalTransactions > 0 ? totalAmount / totalTransactions : 0
        }
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Get recent transactions
   */
  async getRecent(userId, limit = 10) {
    const connection = await pool.getConnection();
    
    try {
      const [transactions] = await connection.execute(`
        SELECT t.*, a.account_key, a.name as account_name, a.user_id
        FROM ${this.tableName} t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ?
        ORDER BY t.created_at DESC
        LIMIT ?
      `, [userId, limit]);
      
      return transactions.map(t => this.formatTransaction(t));
    } finally {
      connection.release();
    }
  }

  /**
   * Get transactions by date range
   */
  async getByDateRange(userId, startDate, endDate, options = {}) {
    const { accountKey, type } = options;
    
    const connection = await pool.getConnection();
    
    try {
      let query = `
        SELECT t.*, a.account_key, a.name as account_name, a.user_id
        FROM ${this.tableName} t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ? AND t.transaction_date BETWEEN ? AND ?
      `;
      const params = [userId, startDate, endDate];
      
      if (accountKey) {
        query += ' AND a.account_key = ?';
        params.push(accountKey);
      }
      
      if (type) {
        query += ' AND t.type = ?';
        params.push(type);
      }
      
      query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
      
      const [transactions] = await connection.execute(query, params);
      
      return transactions.map(t => this.formatTransaction(t));
    } finally {
      connection.release();
    }
  }

  /**
   * Get monthly transaction summary
   */
  async getMonthlySummary(userId, year, month) {
    const connection = await pool.getConnection();
    
    try {
      const [summary] = await connection.execute(`
        SELECT 
          t.type,
          COUNT(*) as count,
          SUM(t.amount) as total_amount,
          DAY(t.transaction_date) as day
        FROM ${this.tableName} t
        JOIN accounts a ON t.account_id = a.id
        WHERE a.user_id = ? 
          AND YEAR(t.transaction_date) = ? 
          AND MONTH(t.transaction_date) = ?
        GROUP BY t.type, DAY(t.transaction_date)
        ORDER BY DAY(t.transaction_date), t.type
      `, [userId, year, month]);
      
      // Organize data by day
      const dailyData = {};
      
      summary.forEach(row => {
        const day = row.day;
        if (!dailyData[day]) {
          dailyData[day] = {};
        }
        
        dailyData[day][row.type] = {
          count: row.count,
          total: parseFloat(row.total_amount || 0)
        };
      });
      
      return dailyData;
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk create transactions
   */
  async bulkCreate(transactions) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = [];
      
      for (const transactionData of transactions) {
        if (!this.validTypes.includes(transactionData.type)) {
          throw new Error(`Invalid transaction type: ${transactionData.type}`);
        }
        
        const [result] = await connection.execute(
          `INSERT INTO ${this.tableName} (account_id, type, amount, description, transaction_date) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            transactionData.account_id,
            transactionData.type,
            transactionData.amount,
            transactionData.description || '',
            transactionData.transaction_date || new Date()
          ]
        );
        
        results.push({
          id: result.insertId,
          ...transactionData
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
   * Delete transactions by account ID
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
   * Get transaction balance impact
   */
  getBalanceImpact(type, amount) {
    const numAmount = parseFloat(amount);
    
    switch (type) {
      case 'deposit':
      case 'bonus-credit':
      case 'historical-win':
        return numAmount; // Positive impact
      case 'withdrawal':
      case 'historical-loss':
      case 'bet':
        return -numAmount; // Negative impact
      default:
        return 0;
    }
  }

  /**
   * Format transaction data
   */
  formatTransaction(transaction) {
    return {
      id: transaction.id,
      accountId: transaction.account_id,
      accountKey: transaction.account_key,
      accountName: transaction.account_name,
      userId: transaction.user_id,
      type: transaction.type,
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      date: transaction.transaction_date instanceof Date ? 
        transaction.transaction_date.toISOString().split('T')[0] : 
        transaction.transaction_date,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      balanceImpact: this.getBalanceImpact(transaction.type, transaction.amount)
    };
  }

  /**
   * Validate transaction data
   */
  validateTransactionData(data) {
    const errors = [];
    
    if (!data.account_id) {
      errors.push('Account ID is required');
    }
    
    if (!data.type || !this.validTypes.includes(data.type)) {
      errors.push(`Type must be one of: ${this.validTypes.join(', ')}`);
    }
    
    if (!data.amount || isNaN(data.amount) || parseFloat(data.amount) <= 0) {
      errors.push('Amount must be a positive number');
    }
    
    if (data.transaction_date && isNaN(Date.parse(data.transaction_date))) {
      errors.push('Transaction date must be a valid date');
    }
    
    return errors;
  }
}

module.exports = new TransactionModel();