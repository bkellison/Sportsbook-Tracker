import { apiService } from './api';

class AccountsService {
  async getAllAccounts() {
    return apiService.get('/accounts');
  }

  async clearAccount(accountKey) {
    return apiService.delete(`/accounts/${accountKey}`);
  }

  async getAccountById(accountId) {
    return apiService.get(`/accounts/${accountId}`);
  }

  async updateAccount(accountKey, data) {
    return apiService.put(`/accounts/${accountKey}`, data);
  }
}

export const accountsService = new AccountsService();
