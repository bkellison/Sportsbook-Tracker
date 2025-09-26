const BaseRepository = require('./BaseRepository');

class AccountRepository extends BaseRepository {
  constructor(database) {
    super(database, 'accounts');
  }

  async findByUserId(userId, tenantId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const connection = await this.db.getConnection();
    try {
      const [accounts] = await connection.execute(
        `SELECT * FROM ${this.tableName} 
         WHERE user_id = ? AND tenant_id = ?
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, tenantId, limit, offset]
      );
      return accounts;
    } finally {
      connection.release();
    }
  }

  async findByUserAndKey(userId, accountKey, tenantId) {
    const connection = await this.db.getConnection();
    try {
      const [accounts] = await connection.execute(
        `SELECT * FROM ${this.tableName} 
         WHERE user_id = ? AND account_key = ? AND tenant_id = ?`,
        [userId, accountKey, tenantId]
      );
      return accounts[0] || null;
    } finally {
      connection.release();
    }
  }

  async getAccountSummary(userId, tenantId) {
    const connection = await this.db.getConnection();
    try {
      const [summary] = await connection.execute(
        `SELECT 
           COUNT(*) as total_accounts,
           SUM(balance) as total_balance,
           MAX(updated_at) as last_activity
         FROM ${this.tableName} 
         WHERE user_id = ? AND tenant_id = ?`,
        [userId, tenantId]
      );
      
      return {
        totalAccounts: parseInt(summary[0].total_accounts) || 0,
        totalBalance: parseFloat(summary[0].total_balance) || 0,
        lastActivity: summary[0].last_activity
      };
    } finally {
      connection.release();
    }
  }

  async getAccountWithTransactions(accountId, tenantId) {
    const connection = await this.db.getConnection();
    try {
      // Get account
      const [accounts] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND tenant_id = ?`,
        [accountId, tenantId]
      );

      if (accounts.length === 0) return null;

      // Get transactions
      const [transactions] = await connection.execute(
        `SELECT * FROM transactions 
         WHERE account_id = ? AND tenant_id = ?
         ORDER BY transaction_date DESC`,
        [accountId, tenantId]
      );

      // Get bets
      const [bets] = await connection.execute(
        `SELECT * FROM bets 
         WHERE account_id = ? AND tenant_id = ?
         ORDER BY bet_date DESC`,
        [accountId, tenantId]
      );

      return {
        ...accounts[0],
        transactions: transactions.map(this.formatTransaction),
        bets: bets.map(this.formatBet)
      };
    } finally {
      connection.release();
    }
  }

  async create(data) {
    // Ensure tenant_id is included
    const createData = {
      ...data,
      tenant_id: data.tenant_id || data.tenantId
    };
    
    return super.create(createData);
  }

  formatTransaction(t) {
    return {
      id: t.id,
      type: t.type,
      amount: parseFloat(t.amount),
      description: t.description,
      date: t.transaction_date.toISOString().split('T')[0]
    };
  }

  formatBet(b) {
    return {
      id: b.id,
      amount: parseFloat(b.amount),
      displayAmount: parseFloat(b.display_amount),
      description: b.description,
      date: b.bet_date.toISOString().split('T')[0],
      status: b.status,
      winnings: parseFloat(b.winnings),
      isBonusBet: Boolean(b.is_bonus_bet)
    };
  }
}

module.exports = AccountRepository;