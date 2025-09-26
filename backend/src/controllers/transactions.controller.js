const { pool } = require('../config/database.config');

class TransactionsController {
  async getAllTransactions(req, res, next) {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 50, accountKey, type } = req.query;
      
      const connection = await pool.getConnection();
      
      try {
        let query = `
          SELECT t.*, a.account_key, a.name as account_name 
          FROM transactions t 
          JOIN accounts a ON t.account_id = a.id 
          WHERE a.user_id = ?
        `;
        
        const queryParams = [userId];
        
        // Add filters
        if (accountKey) {
          query += ' AND a.account_key = ?';
          queryParams.push(accountKey);
        }
        
        if (type) {
          query += ' AND t.type = ?';
          queryParams.push(type);
        }
        
        // Add pagination
        query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);
        
        const [transactions] = await connection.execute(query, queryParams);
        
        // Get total count for pagination
        let countQuery = `
          SELECT COUNT(*) as total 
          FROM transactions t 
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
        
        const [countResult] = await connection.execute(countQuery, countParams);
        const total = countResult[0].total;
        
        const formattedTransactions = transactions.map(transaction => ({
          id: transaction.id,
          accountKey: transaction.account_key,
          accountName: transaction.account_name,
          type: transaction.type,
          amount: parseFloat(transaction.amount),
          description: transaction.description,
          date: transaction.transaction_date.toISOString().split('T')[0],
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at
        }));
        
        res.json({
          transactions: formattedTransactions,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / parseInt(limit))
          }
        });
        
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get all transactions error:', error);
      next(error);
    }
  }

  async getTransactionById(req, res, next) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;
      
      const connection = await pool.getConnection();
      
      try {
        const [transactions] = await connection.execute(`
          SELECT t.*, a.account_key, a.name as account_name 
          FROM transactions t 
          JOIN accounts a ON t.account_id = a.id 
          WHERE t.id = ? AND a.user_id = ?
        `, [transactionId, userId]);
        
        if (transactions.length === 0) {
          return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const transaction = transactions[0];
        const formattedTransaction = {
          id: transaction.id,
          accountKey: transaction.account_key,
          accountName: transaction.account_name,
          type: transaction.type,
          amount: parseFloat(transaction.amount),
          description: transaction.description,
          date: transaction.transaction_date.toISOString().split('T')[0],
          createdAt: transaction.created_at,
          updatedAt: transaction.updated_at
        };
        
        res.json(formattedTransaction);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get transaction by ID error:', error);
      next(error);
    }
  }

  async createTransaction(req, res, next) {
    try {
      const userId = req.user.userId;
      const { account, type, amount, description } = req.body;
      
      // Validation
      if (!account || !type || !amount) {
        return res.status(400).json({ error: 'Account, type, and amount are required' });
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      
      const validTypes = ['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: `Invalid transaction type. Valid types: ${validTypes.join(', ')}` });
      }
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Get account
        const [accounts] = await connection.execute(
          'SELECT * FROM accounts WHERE user_id = ? AND account_key = ?',
          [userId, account]
        );
        
        if (accounts.length === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }
        
        const accountData = accounts[0];
        
        // Check if withdrawal amount exceeds balance
        if (type === 'withdrawal' && numAmount > accountData.balance) {
          return res.status(400).json({ error: 'Insufficient balance for withdrawal' });
        }
        
        // Insert transaction
        const [transactionResult] = await connection.execute(
          'INSERT INTO transactions (account_id, type, amount, description, transaction_date) VALUES (?, ?, ?, ?, CURDATE())',
          [accountData.id, type, numAmount, description || '']
        );
        
        const transactionId = transactionResult.insertId;
        
        // Update account based on transaction type
        let balanceChange = 0;
        let depositChange = 0;
        let withdrawalChange = 0;
        
        switch (type) {
          case 'deposit':
            balanceChange = numAmount;
            depositChange = numAmount;
            break;
          case 'withdrawal':
            balanceChange = -numAmount;
            withdrawalChange = numAmount;
            break;
          case 'bonus-credit':
          case 'historical-win':
            balanceChange = numAmount;
            break;
          case 'historical-loss':
            balanceChange = -numAmount;
            break;
          case 'bet':
            // Insert bet record
            const isBonusBet = description && description.toLowerCase().includes('bonus');
            const betAmount = isBonusBet ? 0 : numAmount;
            
            await connection.execute(
              'INSERT INTO bets (account_id, amount, display_amount, description, bet_date, is_bonus_bet) VALUES (?, ?, ?, ?, CURDATE(), ?)',
              [accountData.id, betAmount, numAmount, description || '', isBonusBet ? 1 : 0]
            );
            
            balanceChange = -betAmount;
            break;
        }
        
        // Update account balances
        await connection.execute(
          'UPDATE accounts SET balance = balance + ?, total_deposits = total_deposits + ?, total_withdrawals = total_withdrawals + ? WHERE id = ?',
          [balanceChange, depositChange, withdrawalChange, accountData.id]
        );
        
        await connection.commit();
        
        res.status(201).json({ 
          success: true, 
          message: 'Transaction created successfully',
          transactionId,
          balanceChange
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Create transaction error:', error);
      next(error);
    }
  }

  async updateTransaction(req, res, next) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;
      const { type, amount, description } = req.body;
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Get transaction and account info
        const [transactions] = await connection.execute(`
          SELECT t.*, a.user_id, a.balance, a.total_deposits, a.total_withdrawals
          FROM transactions t 
          JOIN accounts a ON t.account_id = a.id 
          WHERE t.id = ?
        `, [transactionId]);
        
        if (transactions.length === 0 || transactions[0].user_id !== userId) {
          return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const oldTransaction = transactions[0];
        
        // Validation for new values
        if (amount !== undefined) {
          const numAmount = parseFloat(amount);
          if (isNaN(numAmount) || numAmount <= 0) {
            return res.status(400).json({ error: 'Amount must be a positive number' });
          }
        }
        
        if (type !== undefined) {
          const validTypes = ['deposit', 'withdrawal', 'bet', 'bonus-credit', 'historical-win', 'historical-loss'];
          if (!validTypes.includes(type)) {
            return res.status(400).json({ error: `Invalid transaction type. Valid types: ${validTypes.join(', ')}` });
          }
        }
        
        // Calculate balance changes needed
        const oldAmount = oldTransaction.amount;
        const oldType = oldTransaction.type;
        const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
        const newType = type !== undefined ? type : oldType;
        
        // Revert old transaction effects
        let balanceRevert = 0;
        let depositRevert = 0;
        let withdrawalRevert = 0;
        
        switch (oldType) {
          case 'deposit':
            balanceRevert = -oldAmount;
            depositRevert = -oldAmount;
            break;
          case 'withdrawal':
            balanceRevert = oldAmount;
            withdrawalRevert = -oldAmount;
            break;
          case 'bonus-credit':
          case 'historical-win':
            balanceRevert = -oldAmount;
            break;
          case 'historical-loss':
            balanceRevert = oldAmount;
            break;
          case 'bet':
            balanceRevert = oldAmount; // Add back the bet amount
            break;
        }
        
        // Apply new transaction effects
        let balanceChange = 0;
        let depositChange = 0;
        let withdrawalChange = 0;
        
        switch (newType) {
          case 'deposit':
            balanceChange = newAmount;
            depositChange = newAmount;
            break;
          case 'withdrawal':
            balanceChange = -newAmount;
            withdrawalChange = newAmount;
            break;
          case 'bonus-credit':
          case 'historical-win':
            balanceChange = newAmount;
            break;
          case 'historical-loss':
            balanceChange = -newAmount;
            break;
          case 'bet':
            balanceChange = -newAmount;
            break;
        }
        
        // Update transaction
        const updateFields = [];
        const updateValues = [];
        
        if (type !== undefined) {
          updateFields.push('type = ?');
          updateValues.push(newType);
        }
        if (amount !== undefined) {
          updateFields.push('amount = ?');
          updateValues.push(newAmount);
        }
        if (description !== undefined) {
          updateFields.push('description = ?');
          updateValues.push(description);
        }
        
        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(transactionId);
        
        await connection.execute(
          `UPDATE transactions SET ${updateFields.join(', ')} WHERE id = ?`,
          updateValues
        );
        
        // Update account balances
        const totalBalanceChange = balanceRevert + balanceChange;
        const totalDepositChange = depositRevert + depositChange;
        const totalWithdrawalChange = withdrawalRevert + withdrawalChange;
        
        await connection.execute(
          'UPDATE accounts SET balance = balance + ?, total_deposits = total_deposits + ?, total_withdrawals = total_withdrawals + ? WHERE id = ?',
          [totalBalanceChange, totalDepositChange, totalWithdrawalChange, oldTransaction.account_id]
        );
        
        await connection.commit();
        
        res.json({ 
          success: true, 
          message: 'Transaction updated successfully' 
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Update transaction error:', error);
      next(error);
    }
  }

  async deleteTransaction(req, res, next) {
    try {
      const userId = req.user.userId;
      const { transactionId } = req.params;
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Get transaction and account info
        const [transactions] = await connection.execute(`
          SELECT t.*, a.user_id 
          FROM transactions t 
          JOIN accounts a ON t.account_id = a.id 
          WHERE t.id = ?
        `, [transactionId]);
        
        if (transactions.length === 0 || transactions[0].user_id !== userId) {
          return res.status(404).json({ error: 'Transaction not found' });
        }
        
        const transaction = transactions[0];
        
        // Reverse the transaction effects on account balance
        let balanceChange = 0;
        let depositChange = 0;
        let withdrawalChange = 0;
        
        switch (transaction.type) {
          case 'deposit':
            balanceChange = -transaction.amount; // Remove the deposit
            depositChange = -transaction.amount;
            break;
          case 'withdrawal':
            balanceChange = transaction.amount; // Add back the withdrawal
            withdrawalChange = -transaction.amount;
            break;
          case 'bonus-credit':
          case 'historical-win':
            balanceChange = -transaction.amount; // Remove the credit/win
            break;
          case 'historical-loss':
            balanceChange = transaction.amount; // Add back the loss
            break;
          case 'bet':
            balanceChange = transaction.amount; // Add back the bet amount
            break;
        }
        
        // Update account balances
        await connection.execute(
          'UPDATE accounts SET balance = balance + ?, total_deposits = total_deposits + ?, total_withdrawals = total_withdrawals + ? WHERE id = ?',
          [balanceChange, depositChange, withdrawalChange, transaction.account_id]
        );
        
        // Delete the transaction
        await connection.execute('DELETE FROM transactions WHERE id = ?', [transactionId]);
        
        await connection.commit();
        
        res.json({ 
          success: true, 
          message: 'Transaction deleted successfully' 
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Delete transaction error:', error);
      next(error);
    }
  }

  async getTransactionsByAccount(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountKey } = req.params;
      const { page = 1, limit = 50, type } = req.query;
      
      const connection = await pool.getConnection();
      
      try {
        let query = `
          SELECT t.* 
          FROM transactions t 
          JOIN accounts a ON t.account_id = a.id 
          WHERE a.account_key = ? AND a.user_id = ?
        `;
        
        const queryParams = [accountKey, userId];
        
        if (type) {
          query += ' AND t.type = ?';
          queryParams.push(type);
        }
        
        query += ' ORDER BY t.transaction_date DESC, t.created_at DESC';
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        query += ' LIMIT ? OFFSET ?';
        queryParams.push(parseInt(limit), offset);
        
        const [transactions] = await connection.execute(query, queryParams);
        
        const formattedTransactions = transactions.map(t => ({
          id: t.id,
          type: t.type,
          amount: parseFloat(t.amount),
          description: t.description,
          date: t.transaction_date.toISOString().split('T')[0],
          createdAt: t.created_at,
          updatedAt: t.updated_at
        }));
        
        res.json(formattedTransactions);
        
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get transactions by account error:', error);
      next(error);
    }
  }

  async getTransactionsSummary(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountKey, startDate, endDate } = req.query;
      
      const connection = await pool.getConnection();
      
      try {
        let query = `
          SELECT 
            t.type,
            COUNT(*) as count,
            SUM(t.amount) as total_amount,
            AVG(t.amount) as avg_amount
          FROM transactions t 
          JOIN accounts a ON t.account_id = a.id 
          WHERE a.user_id = ?
        `;
        
        const queryParams = [userId];
        
        if (accountKey) {
          query += ' AND a.account_key = ?';
          queryParams.push(accountKey);
        }
        
        if (startDate) {
          query += ' AND t.transaction_date >= ?';
          queryParams.push(startDate);
        }
        
        if (endDate) {
          query += ' AND t.transaction_date <= ?';
          queryParams.push(endDate);
        }
        
        query += ' GROUP BY t.type ORDER BY t.type';
        
        const [summary] = await connection.execute(query, queryParams);
        
        const formattedSummary = summary.map(row => ({
          type: row.type,
          count: row.count,
          totalAmount: parseFloat(row.total_amount),
          avgAmount: parseFloat(row.avg_amount)
        }));
        
        // Calculate overall totals
        let totalTransactions = 0;
        let totalAmount = 0;
        
        formattedSummary.forEach(row => {
          totalTransactions += row.count;
          totalAmount += row.totalAmount;
        });
        
        res.json({
          summary: formattedSummary,
          totals: {
            totalTransactions,
            totalAmount
          },
          filters: {
            accountKey: accountKey || 'all',
            startDate: startDate || null,
            endDate: endDate || null
          }
        });
        
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get transactions summary error:', error);
      next(error);
    }
  }
}

module.exports = new TransactionsController();