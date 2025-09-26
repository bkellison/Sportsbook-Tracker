const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database.config');
const appConfig = require('../config/app.config');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, password, username } = req.body;
      
      // Validation
      if (!email || !password || !username) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please provide a valid email address' });
      }

      const hashedPassword = await bcrypt.hash(password, appConfig.bcrypt.saltRounds);
      
      const connection = await pool.getConnection();
      
      try {
        await connection.beginTransaction();
        
        // Insert user
        const [userResult] = await connection.execute(
          'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
          [email.toLowerCase(), username, hashedPassword]
        );
        
        const userId = userResult.insertId;
        
        // Insert default accounts
        const defaultAccounts = [
          ['draftkings1', 'DraftKings #1'],
          ['draftkings2', 'DraftKings #2'],
          ['fanduel', 'FanDuel'],
          ['betmgm', 'BetMGM'],
          ['bet365', 'Bet365']
        ];
        
        for (const [key, name] of defaultAccounts) {
          await connection.execute(
            'INSERT INTO accounts (user_id, account_key, name) VALUES (?, ?, ?)',
            [userId, key, name]
          );
        }
        
        await connection.commit();
        
        const token = jwt.sign(
          { userId, email: email.toLowerCase(), username }, 
          appConfig.jwt.secret,
          { expiresIn: appConfig.jwt.expiresIn }
        );
        
        res.status(201).json({ 
          token, 
          user: { id: userId, email: email.toLowerCase(), username }
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Registration error:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage.includes('email')) {
          res.status(400).json({ error: 'Email already exists' });
        } else if (error.sqlMessage.includes('username')) {
          res.status(400).json({ error: 'Username already exists' });
        } else {
          res.status(400).json({ error: 'Account already exists' });
        }
      } else {
        next(error);
      }
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const connection = await pool.getConnection();
      
      try {
        const [users] = await connection.execute(
          'SELECT * FROM users WHERE email = ?',
          [email.toLowerCase()]
        );
        
        if (users.length === 0) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        // Update last login
        await connection.execute(
          'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [user.id]
        );
        
        const token = jwt.sign(
          { userId: user.id, email: user.email, username: user.username }, 
          appConfig.jwt.secret,
          { expiresIn: appConfig.jwt.expiresIn }
        );
        
        res.json({ 
          token, 
          user: { id: user.id, email: user.email, username: user.username }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Login error:', error);
      next(error);
    }
  }

  async validateToken(req, res) {
    // Token is already validated by middleware
    res.json({ 
      valid: true, 
      user: req.user 
    });
  }

  async changePassword(req, res, next) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'New password must be at least 6 characters long' });
      }
      
      const connection = await pool.getConnection();
      
      try {
        const [users] = await connection.execute(
          'SELECT password_hash FROM users WHERE id = ?',
          [userId]
        );
        
        if (users.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const validPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
        
        if (!validPassword) {
          return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        const hashedNewPassword = await bcrypt.hash(newPassword, appConfig.bcrypt.saltRounds);
        
        await connection.execute(
          'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedNewPassword, userId]
        );
        
        res.json({ success: true, message: 'Password changed successfully' });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Change password error:', error);
      next(error);
    }
  }
}

module.exports = new AuthController();