const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User.model');
const appConfig = require('../config/app.config');
const { AppError } = require('../middleware/error.middleware');

class AuthService {
  /**
   * Register a new user
   */
  async register(userData) {
    const { email, username, password } = userData;
    
    try {
      // Check if email already exists
      const existingUserByEmail = await UserModel.findByEmail(email);
      if (existingUserByEmail) {
        throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
      }
      
      // Check if username already exists
      const existingUserByUsername = await UserModel.findByUsername(username);
      if (existingUserByUsername) {
        throw new AppError('Username already exists', 400, 'USERNAME_EXISTS');
      }
      
      // Validate password strength
      this.validatePasswordStrength(password);
      
      // Create user (UserModel handles password hashing and default account creation)
      const user = await UserModel.create({
        email: email.toLowerCase().trim(),
        username: username.trim(),
        password
      });
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      // Remove sensitive data
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        token,
        user: userWithoutPassword,
        message: 'User registered successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      // Handle database constraint errors
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage.includes('email')) {
          throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
        }
        if (error.sqlMessage.includes('username')) {
          throw new AppError('Username already exists', 400, 'USERNAME_EXISTS');
        }
      }
      
      throw new AppError('Registration failed', 500, 'REGISTRATION_FAILED');
    }
  }
  
  /**
   * Login user
   */
  async login(loginData) {
    const { email, password } = loginData;
    
    try {
      // Find user by email
      const user = await UserModel.findByEmail(email.toLowerCase().trim());
      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }
      
      // Update last login
      await UserModel.updateLastLogin(user.id);
      
      // Generate JWT token
      const token = this.generateToken(user);
      
      // Remove sensitive data
      const { password_hash, ...userWithoutPassword } = user;
      
      return {
        success: true,
        token,
        user: userWithoutPassword,
        message: 'Login successful'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Login failed', 500, 'LOGIN_FAILED');
    }
  }
  
  /**
   * Change user password
   */
  async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;
    
    try {
      // Validate new password strength
      this.validatePasswordStrength(newPassword);
      
      // Check if new password is different from current
      if (currentPassword === newPassword) {
        throw new AppError('New password must be different from current password', 400, 'SAME_PASSWORD');
      }
      
      // Update password (UserModel handles verification of current password)
      const success = await UserModel.updatePassword(userId, currentPassword, newPassword);
      
      if (!success) {
        throw new AppError('Failed to update password', 500, 'PASSWORD_UPDATE_FAILED');
      }
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error.message === 'Current password is incorrect') {
        throw new AppError('Current password is incorrect', 401, 'INVALID_CURRENT_PASSWORD');
      }
      
      throw new AppError('Password change failed', 500, 'PASSWORD_CHANGE_FAILED');
    }
  }
  
  /**
   * Refresh JWT token
   */
  async refreshToken(userId) {
    try {
      // Get current user data
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      // Generate new token
      const token = this.generateToken(user);
      
      return {
        success: true,
        token,
        message: 'Token refreshed successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Token refresh failed', 500, 'TOKEN_REFRESH_FAILED');
    }
  }
  
  /**
   * Validate JWT token
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, appConfig.jwt.secret);
      
      // Check if user still exists
      const user = await UserModel.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username
        },
        decoded
      };
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
      }
      
      if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Token validation failed', 401, 'TOKEN_VALIDATION_FAILED');
    }
  }
  
  /**
   * Update user profile
   */
  async updateProfile(userId, profileData) {
    try {
      const { email, username } = profileData;
      const updateData = {};
      
      if (email) {
        // Check if email is already taken by another user
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          throw new AppError('Email already exists', 400, 'EMAIL_EXISTS');
        }
        updateData.email = email.toLowerCase().trim();
      }
      
      if (username) {
        // Check if username is already taken by another user
        const existingUser = await UserModel.findByUsername(username);
        if (existingUser && existingUser.id !== userId) {
          throw new AppError('Username already exists', 400, 'USERNAME_EXISTS');
        }
        updateData.username = username.trim();
      }
      
      if (Object.keys(updateData).length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS_TO_UPDATE');
      }
      
      // Update user profile
      const updatedUser = await UserModel.update(userId, updateData);
      if (!updatedUser) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      return {
        success: true,
        user: updatedUser,
        message: 'Profile updated successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Profile update failed', 500, 'PROFILE_UPDATE_FAILED');
    }
  }
  
  /**
   * Delete user account
   */
  async deleteAccount(userId, password) {
    try {
      // Get user data for password verification
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }
      
      // Verify password before deletion
      const userWithPassword = await UserModel.findByEmail(user.email);
      const isPasswordValid = await bcrypt.compare(password, userWithPassword.password_hash);
      if (!isPasswordValid) {
        throw new AppError('Invalid password', 401, 'INVALID_PASSWORD');
      }
      
      // Delete user and all associated data
      const deleted = await UserModel.delete(userId);
      if (!deleted) {
        throw new AppError('Failed to delete account', 500, 'ACCOUNT_DELETION_FAILED');
      }
      
      return {
        success: true,
        message: 'Account deleted successfully'
      };
      
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError('Account deletion failed', 500, 'ACCOUNT_DELETION_FAILED');
    }
  }
  
  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const stats = await UserModel.getStats(userId);
      
      return {
        success: true,
        stats
      };
      
    } catch (error) {
      throw new AppError('Failed to get user statistics', 500, 'STATS_FETCH_FAILED');
    }
  }
  
  /**
   * Generate JWT token
   */
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      username: user.username
    };
    
    return jwt.sign(payload, appConfig.jwt.secret, {
      expiresIn: appConfig.jwt.expiresIn
    });
  }
  
  /**
   * Validate password strength
   */
  validatePasswordStrength(password) {
    const minLength = 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
      throw new AppError(`Password must be at least ${minLength} characters long`, 400, 'WEAK_PASSWORD');
    }
    
    // Optional: Enforce stronger password requirements
    const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    if (strengthScore < 2) {
      throw new AppError('Password must contain at least 2 of the following: uppercase letters, lowercase letters, numbers, special characters', 400, 'WEAK_PASSWORD');
    }
    
    // Check for common weak passwords
    const commonPasswords = [
      'password', '123456', 'password123', 'admin', 'qwerty', 
      'letmein', 'welcome', 'monkey', '1234567890', 'abc123'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      throw new AppError('Password is too common. Please choose a stronger password', 400, 'COMMON_PASSWORD');
    }
  }
  
  /**
   * Hash password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, appConfig.bcrypt.saltRounds);
  }
  
  /**
   * Compare passwords
   */
  async comparePasswords(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  
  /**
   * Generate secure random token (for password reset, etc.)
   */
  generateSecureToken(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }
  
  /**
   * Validate email format
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate username format
   */
  validateUsername(username) {
    // Username should be 3-30 characters, alphanumeric with underscores and hyphens
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    return usernameRegex.test(username);
  }
  
  /**
   * Check if user exists by email
   */
  async userExistsByEmail(email) {
    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    return !!user;
  }
  
  /**
   * Check if user exists by username
   */
  async userExistsByUsername(username) {
    const user = await UserModel.findByUsername(username.trim());
    return !!user;
  }
}

module.exports = new AuthService();