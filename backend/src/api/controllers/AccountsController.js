const BaseController = require('./BaseController');
const Container = require('../../core/Container');

class AccountsController extends BaseController {
  constructor() {
    super();
    this.accountService = Container.get('accountService');
  }

  async getAllAccounts(req, res) {
    try {
      const userId = req.user.userId;
      const tenantId = req.tenantId; // From tenant middleware
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };
      
      const accounts = await this.accountService.getAllAccounts(userId, tenantId, options);
      
      // Return in existing format for backward compatibility
      return res.json(accounts);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async getAccountById(req, res) {
    try {
      const userId = req.user.userId;
      const tenantId = req.tenantId;
      const { accountKey } = req.params;
      
      const account = await this.accountService.getAccountByKey(userId, accountKey, tenantId);
      
      return res.json(account);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async createAccount(req, res) {
    try {
      const userId = req.user.userId;
      const tenantId = req.tenantId;
      const accountData = req.body;
      
      const account = await this.accountService.createAccount(userId, tenantId, accountData);
      
      return this.sendCreated(res, { account });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async updateAccount(req, res) {
    try {
      const userId = req.user.userId;
      const tenantId = req.tenantId;
      const { accountKey } = req.params;
      const updateData = req.body;
      
      // First verify the account belongs to the user and tenant
      const existingAccount = await Container.get('accountRepository')
        .findByUserAndKey(userId, accountKey, tenantId);
      
      if (!existingAccount) {
        return this.sendNotFound(res, 'Account not found');
      }
      
      const updatedAccount = await this.accountService.updateAccount(
        existingAccount.id, 
        tenantId,
        updateData
      );
      
      return this.sendSuccess(res, { account: updatedAccount });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async getAccountSummary(req, res) {
    try {
      const userId = req.user.userId;
      const tenantId = req.tenantId;
      
      const accountRepository = Container.get('accountRepository');
      const summary = await accountRepository.getAccountSummary(userId, tenantId);
      
      return this.sendSuccess(res, { summary });
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}

module.exports = new AccountsController();