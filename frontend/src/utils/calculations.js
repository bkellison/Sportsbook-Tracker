export class CalculationsService {
  static getTotals(accounts) {
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalBalance = 0;
    let totalBetsWon = 0;
    let totalBetsLost = 0;
    let totalBetsPlaced = 0;
    let totalAmountWagered = 0;
    let currentStreak = 0;
    let longestWinStreak = 0;
    let longestLoseStreak = 0;
    let biggestWin = 0;
    let biggestLoss = 0;
    let lastBetResult = null;
    let historicalWins = 0;
    let historicalLosses = 0;

    Object.entries(accounts).forEach(([key, account]) => {
      totalDeposits += account.totalDeposits || 0;
      totalWithdrawals += account.totalWithdrawals || 0;
      
      const hasBettingActivity = (account.bets || []).length > 0 || 
                               (account.transactions || []).some(t => ['historical-win', 'historical-loss'].includes(t.type));
      
      let adjustedBalance = account.balance || 0;
      if (!hasBettingActivity) {
        const withdrawalSurplus = (account.totalWithdrawals || 0) - (account.totalDeposits || 0);
        if (withdrawalSurplus > 0) {
          adjustedBalance = 0;
          totalWins += withdrawalSurplus;
        }
      }
      
      totalBalance += adjustedBalance;
      
      if (account.transactions) {
        account.transactions.forEach(transaction => {
          if (transaction.type === 'historical-win') {
            historicalWins++;
            totalWins += transaction.amount;
            if (transaction.amount > biggestWin) biggestWin = transaction.amount;
          } else if (transaction.type === 'historical-loss') {
            historicalLosses++;
            totalLosses += transaction.amount;
            totalAmountWagered += transaction.amount;
            if (transaction.amount > biggestLoss) biggestLoss = transaction.amount;
          } else if (transaction.type === 'bonus-credit') {
            if (key === 'fanduel') {
              totalWins += transaction.amount;
            }
          }
        });
      }
      
      if (account.bets) {
        const sortedBets = [...account.bets].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        sortedBets.forEach((bet) => {
          totalAmountWagered += bet.amount;
          totalBetsPlaced++;

          if (bet.status === 'won') {
            const netProfit = (bet.winnings || 0) - bet.amount;
            totalWins += netProfit; 
            totalBetsWon++;
            if (netProfit > biggestWin) biggestWin = netProfit;
            
            if (lastBetResult === 'won') {
              currentStreak++;
            } else {
              if (currentStreak > longestWinStreak) longestWinStreak = currentStreak;
              currentStreak = 1;
            }
            lastBetResult = 'won';
          } else if (bet.status === 'lost') {
            totalLosses += bet.amount;
            totalBetsLost++;
            if (bet.amount > biggestLoss) biggestLoss = bet.amount;
            
            if (lastBetResult === 'lost') {
              currentStreak++;
            } else {
              if (currentStreak > longestLoseStreak) longestLoseStreak = currentStreak;
              currentStreak = 1;
            }
            lastBetResult = 'lost';
          }
        });
      }
    });

    // Final streak check
    if (lastBetResult === 'won' && currentStreak > longestWinStreak) {
      longestWinStreak = currentStreak;
    } else if (lastBetResult === 'lost' && currentStreak > longestLoseStreak) {
      longestLoseStreak = currentStreak;
    }

    const totalHistoricalBets = historicalWins + historicalLosses;
    const adjustedTotalBetsWon = totalBetsWon + historicalWins;
    const adjustedTotalBetsLost = totalBetsLost + historicalLosses;
    const adjustedTotalBetsPlaced = totalBetsPlaced + totalHistoricalBets;

    const netPL = totalWins - totalLosses;
    const winRate = adjustedTotalBetsPlaced > 0 ? (adjustedTotalBetsWon / adjustedTotalBetsPlaced) * 100 : 0;
    const avgBetSize = adjustedTotalBetsPlaced > 0 ? totalAmountWagered / adjustedTotalBetsPlaced : 0;
    const roi = totalAmountWagered > 0 ? (netPL / totalAmountWagered) * 100 : 0;
    const avgWin = adjustedTotalBetsWon > 0 ? totalWins / adjustedTotalBetsWon : 0;
    const avgLoss = adjustedTotalBetsLost > 0 ? totalLosses / adjustedTotalBetsLost : 0;
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;

    return { 
      totalDeposits, 
      totalWithdrawals, 
      totalWins, 
      totalLosses, 
      totalBalance, 
      netPL,
      totalBetsWon: adjustedTotalBetsWon,
      totalBetsLost: adjustedTotalBetsLost,
      totalBetsPlaced: adjustedTotalBetsPlaced,
      totalAmountWagered,
      winRate,
      avgBetSize,
      roi,
      avgWin,
      avgLoss,
      profitFactor,
      longestWinStreak,
      longestLoseStreak,
      currentStreak: lastBetResult === 'won' ? currentStreak : lastBetResult === 'lost' ? -currentStreak : 0,
      biggestWin,
      biggestLoss
    };
  }

  static calculateAccountMetrics(account, accountKey) {
    const bets = account.bets || [];
    const transactions = account.transactions || [];
    
    // Calculate bet-related metrics
    const completedBets = bets.filter(bet => bet.status !== 'pending');
    const wonBets = bets.filter(bet => bet.status === 'won');
    const lostBets = bets.filter(bet => bet.status === 'lost');
    const pendingBets = bets.filter(bet => bet.status === 'pending');
    
    const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalWinnings = wonBets.reduce((sum, bet) => sum + (bet.winnings || 0), 0);
    const totalLosses = lostBets.reduce((sum, bet) => sum + bet.amount, 0);
    
    const winRate = completedBets.length > 0 ? (wonBets.length / completedBets.length) * 100 : 0;
    const netPL = totalWinnings - totalWagered;
    const roi = totalWagered > 0 ? (netPL / totalWagered) * 100 : 0;
    
    return {
      totalBets: bets.length,
      completedBets: completedBets.length,
      wonBets: wonBets.length,
      lostBets: lostBets.length,
      pendingBets: pendingBets.length,
      totalWagered,
      totalWinnings,
      totalLosses,
      winRate,
      netPL,
      roi,
      avgBetSize: bets.length > 0 ? totalWagered / bets.length : 0,
      avgWinAmount: wonBets.length > 0 ? totalWinnings / wonBets.length : 0,
      avgLossAmount: lostBets.length > 0 ? totalLosses / lostBets.length : 0
    };
  }
}
