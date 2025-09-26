const { pool } = require('../config/database.config');

class AccountsController {
  async getAllAccounts(req, res, next) {
    try {
      const userId = req.user.userId;
      const connection = await pool.getConnection();
      
      try {
        // Get accounts
        const [accounts] = await connection.execute(
          'SELECT * FROM accounts WHERE user_id = ? ORDER BY name',
          [userId]
        );
        
        const accountsData = {};
        
        for (const account of accounts) {
          // Get transactions
          const [transactions] = await connection.execute(
            'SELECT * FROM transactions WHERE account_id = ? ORDER BY transaction_date DESC',
            [account.id]
          );
          
          // Get bets
          const [bets] = await connection.execute(
            'SELECT * FROM bets WHERE account_id = ? ORDER BY bet_date DESC',
            [account.id]
          );
          
          accountsData[account.account_key] = {
            name: account.name,
            balance: parseFloat(account.balance),
            totalDeposits: parseFloat(account.total_deposits),
            totalWithdrawals: parseFloat(account.total_withdrawals),
            transactions: transactions.map(t => ({
              id: t.id,
              type: t.type,
              amount: parseFloat(t.amount),
              description: t.description,
              date: t.transaction_date.toISOString().split('T')[0]
            })),
            bets: bets.map(b => ({
              id: b.id,
              amount: parseFloat(b.amount),
              displayAmount: parseFloat(b.display_amount),
              description: b.description,
              date: b.bet_date.toISOString().split('T')[0],
              status: b.status,
              winnings: parseFloat(b.winnings),
              isBonusBet: Boolean(b.is_bonus_bet)
            }))
          };
        }
        
        res.json(accountsData);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get accounts error:', error);
      next(error);
    }
  }

  async getAccountById(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountKey } = req.params;
      
      const connection = await pool.getConnection();
      
      try {
        const [accounts] = await connection.execute(
          'SELECT * FROM accounts WHERE user_id = ? AND account_key = ?',
          [userId, accountKey]
        );
        
        if (accounts.length === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }
        
        const account = accounts[0];
        
        // Get transactions and bets
        const [transactions] = await connection.execute(
          'SELECT * FROM transactions WHERE account_id = ? ORDER BY transaction_date DESC',
          [account.id]
        );
        
        const [bets] = await connection.execute(
          'SELECT * FROM bets WHERE account_id = ? ORDER BY bet_date DESC',
          [account.id]
        );
        
        const accountData = {
          name: account.name,
          balance: parseFloat(account.balance),
          totalDeposits: parseFloat(account.total_deposits),
          totalWithdrawals: parseFloat(account.total_withdrawals),
          transactions: transactions.map(t => ({
            id: t.id,
            type: t.type,
            amount: parseFloat(t.amount),
            description: t.description,
            date: t.transaction_date.toISOString().split('T')[0]
          })),
          bets: bets.map(b => ({
            id: b.id,
            amount: parseFloat(b.amount),
            displayAmount: parseFloat(b.display_amount),
            description: b.description,
            date: b.bet_date.toISOString().split('T')[0],
            status: b.status,
            winnings: parseFloat(b.winnings),
            isBonusBet: Boolean(b.is_bonus_bet)
          }))
        };
        
        res.json(accountData);
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Get account by ID error:', error);
      next(error);
    }
  }

  async clearAccount(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountKey } = req.params;
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Get account
        const [accounts] = await connection.execute(
          'SELECT * FROM accounts WHERE user_id = ? AND account_key = ?',
          [userId, accountKey]
        );
        
        if (accounts.length === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }
        
        const account = accounts[0];
        
        // Delete transactions and bets
        await connection.execute('DELETE FROM transactions WHERE account_id = ?', [account.id]);
        await connection.execute('DELETE FROM bets WHERE account_id = ?', [account.id]);
        
        // Reset account balances
        await connection.execute(
          'UPDATE accounts SET balance = 0, total_deposits = 0, total_withdrawals = 0 WHERE id = ?',
          [account.id]
        );
        
        await connection.commit();
        res.json({ success: true, message: 'Account cleared successfully' });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Clear account error:', error);
      next(error);
    }
  }

  async updateAccount(req, res, next) {
    try {
      const userId = req.user.userId;
      const { accountKey } = req.params;
      const { name, balance } = req.body;
      
      const connection = await pool.getConnection();
      
      try {
        const [result] = await connection.execute(
          'UPDATE accounts SET name = ?, balance = ? WHERE user_id = ? AND account_key = ?',
          [name, balance, userId, accountKey]
        );
        
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: 'Account not found' });
        }
        
        res.json({ success: true, message: 'Account updated successfully' });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Update account error:', error);
      next(error);
    }
  }
}

module.exports = new AccountsController();