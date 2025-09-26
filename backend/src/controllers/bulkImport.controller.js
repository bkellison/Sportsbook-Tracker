const { pool } = require('../config/database.config');

class BulkImportController {
  async bulkImport(req, res, next) {
    console.log('\n=== BULK IMPORT ATTEMPT ===');
    console.log('Request body:', req.body);
    
    try {
      const userId = req.user.userId;
      const { data } = req.body;
      
      if (!data || typeof data !== 'string') {
        console.log('❌ No data provided or data is not a string');
        return res.status(400).json({ error: 'No data provided' });
      }
      
      const lines = data.trim().split('\n').filter(line => line.trim().length > 0);
      console.log(`Processing ${lines.length} lines of data`);
      
      if (lines.length === 0) {
        return res.status(400).json({ error: 'No valid data lines found' });
      }
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Get all user accounts
        console.log('Fetching user accounts...');
        const [accounts] = await connection.execute(
          'SELECT * FROM accounts WHERE user_id = ?',
          [userId]
        );
        
        const accountMap = {};
        accounts.forEach(acc => {
          accountMap[acc.account_key] = acc;
        });
        
        console.log('Available accounts:', Object.keys(accountMap));
        
        let processedCount = 0;
        const errors = [];
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          console.log(`\nProcessing line ${i + 1}: ${line}`);
          
          // Split by comma and clean up each part
          const parts = line.split(',').map(p => p.trim());
          
          if (parts.length < 3) {
            const error = `Line ${i + 1}: Not enough parts (need at least 3)`;
            console.log(`❌ ${error}`);
            errors.push(error);
            continue;
          }
          
          const [accountKey, type, amountStr, ...descriptionParts] = parts;
          const description = descriptionParts.join(',').trim() || `Imported ${type}`;
          const numAmount = parseFloat(amountStr);
          
          console.log(`Account: ${accountKey}, Type: ${type}, Amount: ${numAmount}, Description: ${description}`);
          
          // Validate inputs
          if (!accountKey || !type || isNaN(numAmount) || numAmount < 0) {
            const error = `Line ${i + 1}: Invalid data`;
            console.log(`❌ ${error}`);
            errors.push(error);
            continue;
          }
          
          // Validate transaction type
          const validTypes = ['deposit', 'withdrawal', 'bet', 'bonus-bet', 'bonus-credit', 'historical-win', 'historical-loss'];
          if (!validTypes.includes(type)) {
            const error = `Line ${i + 1}: Invalid transaction type '${type}'. Valid types: ${validTypes.join(', ')}`;
            console.log(`❌ ${error}`);
            errors.push(error);
            continue;
          }
          
          if (!accountMap[accountKey]) {
            const error = `Line ${i + 1}: Account '${accountKey}' not found`;
            console.log(`❌ ${error}`);
            errors.push(error);
            continue;
          }
          
          const account = accountMap[accountKey];
          
          try {
            // Insert transaction record
            console.log('Inserting transaction...');
            await connection.execute(
              'INSERT INTO transactions (account_id, type, amount, description, transaction_date) VALUES (?, ?, ?, ?, CURDATE())',
              [account.id, type, numAmount, description]
            );
            
            // Handle different transaction types
            let balanceChange = 0;
            let depositChange = 0;
            let withdrawalChange = 0;
            
            if (type === 'deposit') {
              balanceChange = numAmount;
              depositChange = numAmount;
              console.log(`✅ Deposit: +${numAmount} to balance, +${numAmount} to total deposits`);
              
            } else if (type === 'withdrawal') {
              balanceChange = -numAmount;
              withdrawalChange = numAmount;
              console.log(`✅ Withdrawal: -${numAmount} from balance, +${numAmount} to total withdrawals`);
              
            } else if (type === 'bet') {
              // Regular bet - subtract from balance
              const betAmount = numAmount;
              
              await connection.execute(
                'INSERT INTO bets (account_id, amount, display_amount, description, bet_date, is_bonus_bet) VALUES (?, ?, ?, ?, CURDATE(), ?)',
                [account.id, betAmount, numAmount, description, 0]
              );
              
              balanceChange = -betAmount;
              console.log(`✅ Regular bet: -${betAmount} from balance, bet created`);
              
            } else if (type === 'bonus-bet') {
              // Bonus bet - don't subtract from balance (free bet)
              const betAmount = 0; // No real money risked
              
              await connection.execute(
                'INSERT INTO bets (account_id, amount, display_amount, description, bet_date, is_bonus_bet) VALUES (?, ?, ?, ?, CURDATE(), ?)',
                [account.id, betAmount, numAmount, description, 1]
              );
              
              balanceChange = 0; // No balance change for bonus bets
              console.log(`✅ Bonus bet: $0 from balance (free bet), bet created for display amount ${numAmount}`);
              
            } else if (type === 'bonus-credit') {
              balanceChange = numAmount;
              console.log(`✅ Bonus credit: +${numAmount} to balance`);
              
            } else if (type === 'historical-win') {
              balanceChange = numAmount;
              console.log(`✅ Historical win: +${numAmount} to balance`);
              
            } else if (type === 'historical-loss') {
              balanceChange = -numAmount;
              console.log(`✅ Historical loss: -${numAmount} from balance`);
              
            } else {
              const error = `Line ${i + 1}: Unknown transaction type: ${type}`;
              console.log(`❌ ${error}`);
              errors.push(error);
              continue;
            }
            
            // Update account balances
            if (balanceChange !== 0 || depositChange !== 0 || withdrawalChange !== 0) {
              await connection.execute(
                'UPDATE accounts SET balance = balance + ?, total_deposits = total_deposits + ?, total_withdrawals = total_withdrawals + ? WHERE id = ?',
                [balanceChange, depositChange, withdrawalChange, account.id]
              );
            }
            
            console.log(`✅ Account ${accountKey} updated: balance change ${balanceChange}`);
            processedCount++;
            
          } catch (lineError) {
            const error = `Line ${i + 1}: Database error - ${lineError.message}`;
            console.error(`❌ ${error}`);
            errors.push(error);
            continue;
          }
        }
        
        await connection.commit();
        
        console.log(`✅ Bulk import successful! Processed ${processedCount} transactions`);
        
        const response = { 
          success: true, 
          message: `Successfully imported ${processedCount} transactions`,
          processed: processedCount,
          totalLines: lines.length
        };
        
        if (errors.length > 0) {
          response.warnings = errors;
          response.message += ` with ${errors.length} warnings`;
        }
        
        res.json(response);
        
      } catch (error) {
        console.error('❌ Transaction error:', error);
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ Bulk import error:', error);
      console.error('Error stack:', error.stack);
      next(error);
    }
  }

  async resetAllData(req, res, next) {
    try {
      const userId = req.user.userId;
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Get all user accounts
        const [accounts] = await connection.execute(
          'SELECT id FROM accounts WHERE user_id = ?',
          [userId]
        );
        
        const accountIds = accounts.map(acc => acc.id);
        
        if (accountIds.length > 0) {
          // Delete all transactions and bets for user accounts
          const placeholders = accountIds.map(() => '?').join(',');
          
          await connection.execute(
            `DELETE FROM transactions WHERE account_id IN (${placeholders})`,
            accountIds
          );
          
          await connection.execute(
            `DELETE FROM bets WHERE account_id IN (${placeholders})`,
            accountIds
          );
          
          // Reset all account balances
          await connection.execute(
            `UPDATE accounts SET balance = 0, total_deposits = 0, total_withdrawals = 0 WHERE user_id = ?`,
            [userId]
          );
        }
        
        await connection.commit();
        
        console.log(`✅ Reset all data for user ${userId}`);
        res.json({ success: true, message: 'All data has been reset successfully' });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Reset all data error:', error);
      next(error);
    }
  }

  async exportData(req, res, next) {
    try {
      const userId = req.user.userId;
      const connection = await pool.getConnection();
      
      try {
        // Get all accounts with transactions and bets
        const [accounts] = await connection.execute(
          'SELECT * FROM accounts WHERE user_id = ?',
          [userId]
        );
        
        let csvContent = "Account,Type,Amount,Description,Date,Status,Winnings,IsBonusBet\n";
        
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
          
          // Add transactions to CSV
          transactions.forEach(transaction => {
            csvContent += `${account.account_key},${transaction.type},${transaction.amount},"${(transaction.description || '').replace(/"/g, '""')}",${transaction.transaction_date.toISOString().split('T')[0]},completed,0,false\n`;
          });
          
          // Add bets to CSV
          bets.forEach(bet => {
            csvContent += `${account.account_key},bet,${bet.amount},"${(bet.description || '').replace(/"/g, '""')}",${bet.bet_date.toISOString().split('T')[0]},${bet.status},${bet.winnings || 0},${bet.is_bonus_bet}\n`;
          });
        }
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sportsbook_data_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csvContent);
        
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Export data error:', error);
      next(error);
    }
  }
}

module.exports = new BulkImportController();