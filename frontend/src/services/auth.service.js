import { apiService } from './api';

class AuthService {
  async login(email, password) {
    const response = await apiService.post('/auth/login', { email, password });
    return response;
  }

  async register(email, password, username) {
    const response = await apiService.post('/auth/register', { 
      email, 
      password, 
      username 
    });
    return response;
  }

  async validateToken(token) {
    try {
      // Decode JWT token to get user info
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      // Check if token is expired
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
      }
      
      return {
        id: payload.userId,
        email: payload.email,
        username: payload.username
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  logout() {
    localStorage.removeItem('token');
  }

  getCurrentUser() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    try {
      return this.validateToken(token);
    } catch {
      return null;
    }
  }

  isAuthenticated() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      this.validateToken(token);
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();