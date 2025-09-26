const { pool } = require('../config/database.config');

class BetsController {
  // ... (keep your existing getAllBets method)

  async getAllBets(req, res) {
    try {
      const userId = req.user.userId;
      const { accountKey, page = 1, limit = 10, status, startDate, endDate } = req.query;
      
      console.log('🔍 BetsController.getAllBets called with:', {
        userId,
        accountKey, 
        page,
        limit,
        status,
        startDate,
        endDate
      });

      const connection = await pool.getConnection();
      
      try {
        // First, get current user info for debugging
        const [currentUser] = await connection.execute(
          'SELECT id, username, email FROM users WHERE id = ?',
          [userId]
        );
        
        console.log('👤 Current user:', currentUser[0]);

        // Get all accounts for this user to debug
        const [userAccounts] = await connection.execute(
          'SELECT id, account_key, name FROM accounts WHERE user_id = ?',
          [userId]
        );
        
        console.log('📊 User accounts:', userAccounts);

        // Get total bet count for this user
        const [userBetsCount] = await connection.execute(
          'SELECT COUNT(*) as total FROM bets b JOIN accounts a ON b.account_id = a.id WHERE a.user_id = ?',
          [userId]
        );
        
        console.log('🎯 Total bets for user:', userBetsCount[0].total);

        // Main query for bets
        let query = `
          SELECT 
            b.id,
            b.account_id,
            b.amount,
            b.display_amount,
            b.description,
            b.bet_date,
            b.status,
            b.winnings,
            b.is_bonus_bet,
            b.created_at,
            b.updated_at,
            a.account_key,
            a.name as account_name
          FROM bets b
          JOIN accounts a ON b.account_id = a.id
          WHERE a.user_id = ?
        `;
        
        const queryParams = [userId];
        
        if (accountKey) {
          query += ' AND a.account_key = ?';
          queryParams.push(accountKey);
        }
        
        query += ' ORDER BY b.bet_date DESC, b.created_at DESC LIMIT 20';
        
        console.log('🔍 Final query:', query);
        console.log('🔍 Query params:', queryParams);
        
        const [bets] = await connection.execute(query, queryParams);
        console.log(`✅ Query returned ${bets.length} bets`);

        if (bets.length > 0) {
          console.log('🔍 Sample bet:', bets[0]);
        }

        const formattedBets = bets.map(bet => ({
          id: bet.id,
          accountKey: bet.account_key,
          accountName: bet.account_name,
          amount: parseFloat(bet.amount),
          displayAmount: parseFloat(bet.display_amount),
          description: bet.description,
          betDate: bet.bet_date,
          status: bet.status,
          winnings: bet.winnings ? parseFloat(bet.winnings) : 0,
          isBonusBet: bet.is_bonus_bet === 1,
          createdAt: bet.created_at,
          updatedAt: bet.updated_at
        }));

        const response = {
          success: true,
          bets: formattedBets,
          pagination: {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            total: formattedBets.length,
            totalPages: Math.ceil(formattedBets.length / 10)
          },
          debug: {
            frontendUserId: userId,
            databaseUserFound: currentUser[0],
            accountsForUser: userAccounts.length,
            totalBetsForUser: userBetsCount[0].total,
            betsReturned: formattedBets.length,
            requestedAccount: accountKey
          }
        };

        console.log('✅ Final response debug info:', response.debug);
        res.json(response);
        
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ BetsController.getAllBets error:', error);
      res.status(500).json({
        error: 'Failed to fetch bets',
        message: error.message
      });
    }
  }

  async getBetById(req, res) {
    try {
      const userId = req.user.userId;
      const { betId } = req.params;
      
      console.log('🔍 BetsController.getBetById called:', { userId, betId });
      
      const connection = await pool.getConnection();
      
      try {
        const [bets] = await connection.execute(`
          SELECT 
            b.*,
            a.account_key,
            a.name as account_name,
            a.user_id
          FROM bets b
          JOIN accounts a ON b.account_id = a.id
          WHERE b.id = ? AND a.user_id = ?
        `, [betId, userId]);
        
        if (bets.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Bet not found'
          });
        }
        
        const bet = bets[0];
        const formattedBet = {
          id: bet.id,
          accountKey: bet.account_key,
          accountName: bet.account_name,
          amount: parseFloat(bet.amount),
          displayAmount: parseFloat(bet.display_amount),
          description: bet.description,
          betDate: bet.bet_date,
          status: bet.status,
          winnings: bet.winnings ? parseFloat(bet.winnings) : 0,
          isBonusBet: bet.is_bonus_bet === 1,
          createdAt: bet.created_at,
          updatedAt: bet.updated_at
        };
        
        res.json({
          success: true,
          bet: formattedBet
        });
        
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ BetsController.getBetById error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bet',
        message: error.message
      });
    }
  }

  async updateBetStatus(req, res) {
    try {
      const userId = req.user.userId;
      const { betId } = req.params;
      const { status, winnings = 0 } = req.body;
      
      console.log('🔄 BetsController.updateBetStatus called:', { 
        userId, 
        betId, 
        status, 
        winnings 
      });
      
      // Validate status
      const validStatuses = ['pending', 'won', 'lost'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status. Must be pending, won, or lost'
        });
      }
      
      // Validate winnings for won bets
      if (status === 'won') {
        const winningsAmount = parseFloat(winnings);
        if (isNaN(winningsAmount) || winningsAmount <= 0) {
          return res.status(400).json({
            success: false,
            error: 'Valid winnings amount required for won bets'
          });
        }
      }
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // First, get the bet and verify ownership
        const [bets] = await connection.execute(`
          SELECT 
            b.*,
            a.account_key,
            a.name as account_name,
            a.user_id,
            a.id as account_id
          FROM bets b
          JOIN accounts a ON b.account_id = a.id
          WHERE b.id = ? AND a.user_id = ?
        `, [betId, userId]);
        
        if (bets.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: 'Bet not found'
          });
        }
        
        const bet = bets[0];
        
        if (bet.status !== 'pending') {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            error: 'Can only update pending bets'
          });
        }
        
        // Update bet status and winnings
        await connection.execute(`
          UPDATE bets 
          SET status = ?, winnings = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [status, parseFloat(winnings) || 0, betId]);
        
        // Update account balance for winning bets
        if (status === 'won' && parseFloat(winnings) > 0) {
          await connection.execute(`
            UPDATE accounts 
            SET balance = balance + ? 
            WHERE id = ?
          `, [parseFloat(winnings), bet.account_id]);
        }
        
        await connection.commit();
        
        // Get updated bet data
        const [updatedBets] = await connection.execute(`
          SELECT 
            b.*,
            a.account_key,
            a.name as account_name
          FROM bets b
          JOIN accounts a ON b.account_id = a.id
          WHERE b.id = ?
        `, [betId]);
        
        const updatedBet = updatedBets[0];
        const formattedBet = {
          id: updatedBet.id,
          accountKey: updatedBet.account_key,
          accountName: updatedBet.account_name,
          amount: parseFloat(updatedBet.amount),
          displayAmount: parseFloat(updatedBet.display_amount),
          description: updatedBet.description,
          betDate: updatedBet.bet_date,
          status: updatedBet.status,
          winnings: updatedBet.winnings ? parseFloat(updatedBet.winnings) : 0,
          isBonusBet: updatedBet.is_bonus_bet === 1,
          createdAt: updatedBet.created_at,
          updatedAt: updatedBet.updated_at
        };
        
        console.log('✅ Bet status updated successfully:', formattedBet);
        
        res.json({
          success: true,
          bet: formattedBet,
          message: `Bet marked as ${status}`,
          balanceUpdate: status === 'won' ? parseFloat(winnings) : 0
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ BetsController.updateBetStatus error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update bet status',
        message: error.message
      });
    }
  }

  async deleteBet(req, res) {
    try {
      const userId = req.user.userId;
      const { betId } = req.params;
      
      console.log('🗑️ BetsController.deleteBet called:', { userId, betId });
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // First, get the bet and verify ownership
        const [bets] = await connection.execute(`
          SELECT 
            b.*,
            a.account_key,
            a.name as account_name,
            a.user_id,
            a.id as account_id
          FROM bets b
          JOIN accounts a ON b.account_id = a.id
          WHERE b.id = ? AND a.user_id = ?
        `, [betId, userId]);
        
        if (bets.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            error: 'Bet not found'
          });
        }
        
        const bet = bets[0];
        
        // Calculate balance adjustment needed
        let balanceAdjustment = 0;
        
        if (bet.status === 'pending' && !bet.is_bonus_bet && bet.amount > 0) {
          // Return money to balance for pending non-bonus bets
          balanceAdjustment = parseFloat(bet.amount);
        } else if (bet.status === 'won' && bet.winnings > 0) {
          // Remove winnings from balance for won bets
          balanceAdjustment = -parseFloat(bet.winnings);
        }
        
        // Delete the bet
        const [deleteResult] = await connection.execute(`
          DELETE FROM bets WHERE id = ?
        `, [betId]);
        
        if (deleteResult.affectedRows === 0) {
          await connection.rollback();
          return res.status(500).json({
            success: false,
            error: 'Failed to delete bet'
          });
        }
        
        // Update account balance if needed
        if (balanceAdjustment !== 0) {
          await connection.execute(`
            UPDATE accounts 
            SET balance = balance + ? 
            WHERE id = ?
          `, [balanceAdjustment, bet.account_id]);
        }
        
        await connection.commit();
        
        console.log('✅ Bet deleted successfully:', {
          betId,
          balanceAdjustment,
          originalStatus: bet.status,
          originalAmount: bet.amount,
          originalWinnings: bet.winnings
        });
        
        res.json({
          success: true,
          message: 'Bet deleted successfully',
          balanceAdjustment,
          deletedBet: {
            id: bet.id,
            accountKey: bet.account_key,
            amount: parseFloat(bet.amount),
            status: bet.status,
            winnings: bet.winnings ? parseFloat(bet.winnings) : 0
          }
        });
        
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ BetsController.deleteBet error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete bet',
        message: error.message
      });
    }
  }

  async getBetStats(req, res) {
    try {
      const userId = req.user.userId;
      const { accountKey, startDate, endDate } = req.query;
      
      console.log('📊 BetsController.getBetStats called:', {
        userId,
        accountKey,
        startDate,
        endDate
      });
      
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
          FROM bets b
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
        
        // Process stats
        let totalBets = 0;
        let totalWagered = 0;
        let totalWinnings = 0;
        let wonBets = 0;
        let lostBets = 0;
        let pendingBets = 0;
        
        const processedStats = {};
        
        stats.forEach(stat => {
          const key = `${stat.status}_${stat.is_bonus_bet ? 'bonus' : 'regular'}`;
          processedStats[key] = {
            count: stat.count,
            totalAmount: parseFloat(stat.total_amount || 0),
            totalDisplayAmount: parseFloat(stat.total_display_amount || 0),
            totalWinnings: parseFloat(stat.total_winnings || 0),
            avgAmount: parseFloat(stat.avg_amount || 0),
            minAmount: parseFloat(stat.min_amount || 0),
            maxAmount: parseFloat(stat.max_amount || 0),
            maxWinnings: parseFloat(stat.max_winnings || 0)
          };
          
          totalBets += stat.count;
          totalWagered += parseFloat(stat.total_amount || 0);
          totalWinnings += parseFloat(stat.total_winnings || 0);
          
          if (stat.status === 'won') wonBets += stat.count;
          if (stat.status === 'lost') lostBets += stat.count;
          if (stat.status === 'pending') pendingBets += stat.count;
        });
        
        const winRate = totalBets > 0 ? ((wonBets / totalBets) * 100) : 0;
        const netProfit = totalWinnings - totalWagered;
        const roi = totalWagered > 0 ? ((netProfit / totalWagered) * 100) : 0;
        
        res.json({
          success: true,
          stats: {
            summary: {
              totalBets,
              totalWagered,
              totalWinnings,
              netProfit,
              wonBets,
              lostBets,
              pendingBets,
              winRate: parseFloat(winRate.toFixed(2)),
              roi: parseFloat(roi.toFixed(2))
            },
            detailed: processedStats
          }
        });
        
      } finally {
        connection.release();
      }
      
    } catch (error) {
      console.error('❌ BetsController.getBetStats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch bet statistics',
        message: error.message
      });
    }
  }
}

console.log('🔍 Enhanced BetsController loaded with full implementations');
module.exports = new BetsController();