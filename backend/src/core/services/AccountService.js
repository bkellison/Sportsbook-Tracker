const IAccountService = require('../interfaces/IAccountService');
const { NotFoundError, BusinessLogicError } = require('../../shared/errors');
const Logger = require('../../infrastructure/logging/Logger');

class AccountService extends IAccountService {
  constructor(accountRepository, transactionRepository, cacheService) {
    super();
    this.accountRepository = accountRepository;
    this.transactionRepository = transactionRepository;
    this.cache = cacheService;
    this.logger = Logger.getInstance();
  }

  async getAllAccounts(userId, tenantId, options = {}) {
    const cacheKey = `tenant:${tenantId}:user:${userId}:accounts`;
    
    // Try cache first
    let accounts = await this.cache.get(cacheKey);
    
    if (!accounts) {
      const accountsData = await this.accountRepository.findByUserId(userId, tenantId, options);
      
      // Transform to your existing format
      accounts = {};
      
      for (const account of accountsData) {
        const fullAccount = await this.accountRepository.getAccountWithTransactions(account.id, tenantId);
        
        accounts[account.account_key] = {
          name: account.name,
          balance: parseFloat(account.balance),
          totalDeposits: parseFloat(account.total_deposits || 0),
          totalWithdrawals: parseFloat(account.total_withdrawals || 0),
          transactions: fullAccount.transactions || [],
          bets: fullAccount.bets || []
        };
      }
      
      // Cache for 5 minutes
      await this.cache.set(cacheKey, accounts, 300);
    }

    this.logger.info('Tenant accounts retrieved', { 
      userId, 
      tenantId, 
      count: Object.keys(accounts).length 
    });
    return accounts;
  }

  async getAccountByKey(userId, accountKey, tenantId) {
    const account = await this.accountRepository.findByUserAndKey(userId, accountKey, tenantId);
    
    if (!account) {
      throw new NotFoundError('Account not found');
    }

    const fullAccount = await this.accountRepository.getAccountWithTransactions(account.id, tenantId);
    
    return {
      name: fullAccount.name,
      balance: parseFloat(fullAccount.balance),
      totalDeposits: parseFloat(fullAccount.total_deposits || 0),
      totalWithdrawals: parseFloat(fullAccount.total_withdrawals || 0),
      transactions: fullAccount.transactions || [],
      bets: fullAccount.bets || []
    };
  }

  async createAccount(userId, tenantId, accountData) {
    // Validate business rules
    const existingAccount = await this.accountRepository.findByUserAndKey(
      userId, 
      accountData.account_key,
      tenantId
    );

    if (existingAccount) {
      throw new BusinessLogicError('Account with this key already exists');
    }

    // Check tenant limits
    const Container = require('../Container');
    const tenantService = Container.get('tenantService');
    const limitCheck = await tenantService.checkResourceLimit(tenantId, 'accounts');
    
    if (!limitCheck.allowed) {
      throw new BusinessLogicError(`Account limit reached (${limitCheck.limit}). Please upgrade your plan.`);
    }

    const account = await this.accountRepository.create({
      user_id: userId,
      tenant_id: tenantId,
      account_key: accountData.account_key,
      name: accountData.name,
      balance: accountData.balance || 0,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Track resource usage
    await tenantService.incrementResourceUsage(tenantId, 'accounts', 1);

    // Clear cache
    await this.cache.delete(`tenant:${tenantId}:user:${userId}:accounts`);

    this.logger.info('Tenant account created', { userId, tenantId, accountId: account.id });
    return account;
  }

  async updateAccount(accountId, tenantId, updateData) {
    const account = await this.accountRepository.findById(accountId);
    
    if (!account || account.tenant_id !== tenantId) {
      throw new NotFoundError('Account not found');
    }

    const updatedAccount = await this.accountRepository.update(accountId, {
      ...updateData,
      updated_at: new Date()
    });

    // Clear relevant caches
    await this.cache.delete(`tenant:${tenantId}:user:${account.user_id}:accounts`);

    this.logger.info('Tenant account updated', { accountId, tenantId, updateData });
    return updatedAccount;
  }

  async deleteAccount(accountId, tenantId) {
    const account = await this.accountRepository.findById(accountId);
    
    if (!account || account.tenant_id !== tenantId) {
      throw new NotFoundError('Account not found');
    }

    await this.accountRepository.delete(accountId);

    // Update resource usage
    const Container = require('../Container');
    const tenantService = Container.get('tenantService');
    await tenantService.incrementResourceUsage(tenantId, 'accounts', -1);

    // Clear caches
    await this.cache.delete(`tenant:${tenantId}:user:${account.user_id}:accounts`);

    this.logger.info('Tenant account deleted', { accountId, tenantId });
    return { success: true };
  }
}

module.exports = AccountService;