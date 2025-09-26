class IAccountService {
  async getAllAccounts(userId, options = {}) {
    throw new Error('Method must be implemented');
  }
  
  async getAccountByKey(userId, accountKey) {
    throw new Error('Method must be implemented');
  }
  
  async createAccount(userId, accountData) {
    throw new Error('Method must be implemented');
  }
  
  async updateAccount(accountId, updateData) {
    throw new Error('Method must be implemented');
  }
  
  async deleteAccount(accountId) {
    throw new Error('Method must be implemented');
  }
}

module.exports = IAccountService;