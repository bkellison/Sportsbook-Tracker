import { apiService } from './api';

class BetsService {
  async getBets(filters = {}) {
    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      const endpoint = `/bets${queryString ? `?${queryString}` : ''}`;
      
      console.log('Fetching bets from:', endpoint);
      return await apiService.get(endpoint);
    } catch (error) {
      console.error('Get bets error:', error);
      throw new Error('Failed to fetch bets');
    }
  }

  async updateBetStatus(betId, status, winnings = 0) {
    try {
      return await apiService.put(`/bets/${betId}`, { 
        status, 
        winnings: parseFloat(winnings) || 0 
      });
    } catch (error) {
      console.error('Update bet status error:', error);
      throw new Error('Failed to update bet status');
    }
  }

  async settleBet(betId, status, winnings = 0) {
    try {
      return await apiService.put(`/bets/${betId}`, { 
        status, 
        winnings: parseFloat(winnings) || 0 
      });
    } catch (error) {
      console.error('Settle bet error:', error);
      throw new Error('Failed to settle bet');
    }
  }

  async deleteBet(betId) {
    try {
      return await apiService.delete(`/bets/${betId}`);
    } catch (error) {
      console.error('Delete bet error:', error);
      throw new Error('Failed to delete bet');
    }
  }

  async getBetById(betId) {
    try {
      return await apiService.get(`/bets/${betId}`);
    } catch (error) {
      console.error('Get bet by ID error:', error);
      throw new Error('Failed to fetch bet');
    }
  }

  async getAllBets() {
    try {
      return await apiService.get('/bets');
    } catch (error) {
      console.error('Get all bets error:', error);
      throw new Error('Failed to fetch all bets');
    }
  }

  async getBetsByAccount(accountKey) {
    try {
      return await apiService.get(`/bets/account/${accountKey}`);
    } catch (error) {
      console.error('Get bets by account error:', error);
      throw new Error('Failed to fetch bets for account');
    }
  }

  async createBet(betData) {
    try {
      return await apiService.post('/bets', betData);
    } catch (error) {
      console.error('Create bet error:', error);
      throw new Error('Failed to create bet');
    }
  }

  async getPendingBets() {
    try {
      return await apiService.get('/bets/pending');
    } catch (error) {
      console.error('Get pending bets error:', error);
      throw new Error('Failed to fetch pending bets');
    }
  }

  async getBetStats(filters = {}) {
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      const endpoint = `/bets/stats${queryString ? `?${queryString}` : ''}`;
      
      return await apiService.get(endpoint);
    } catch (error) {
      console.error('Get bet stats error:', error);
      throw new Error('Failed to fetch bet statistics');
    }
  }
}

export const betsService = new BetsService();