const express = require('express');
const router = express.Router();

// Controllers
const AuthController = require('../controllers/auth.controller');

// Middleware
const { 
  authenticateToken, 
  createAuthRateLimit, 
  logAuthEvent 
} = require('../middleware/auth.middleware');
const { 
  validateUserRegistration, 
  validateUserLogin,
  validate,
  rules
} = require('../middleware/validation.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

// Rate limiting for auth endpoints
const authRateLimit = createAuthRateLimit();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  authRateLimit,
  logAuthEvent('REGISTRATION_ATTEMPT'),
  validateUserRegistration,
  asyncHandler(AuthController.register)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login',
  authRateLimit,
  logAuthEvent('LOGIN_ATTEMPT'),
  validateUserLogin,
  asyncHandler(AuthController.login)
);

/**
 * @route   GET /api/auth/validate
 * @desc    Validate JWT token
 * @access  Private
 */
router.get('/validate',
  authenticateToken,
  logAuthEvent('TOKEN_VALIDATION'),
  asyncHandler(AuthController.validateToken)
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  authenticateToken,
  authRateLimit,
  logAuthEvent('PASSWORD_CHANGE_ATTEMPT'),
  validate({
    currentPassword: [
      rules.required('Current password is required'),
      rules.string()
    ],
    newPassword: [
      rules.required('New password is required'),
      rules.string(),
      rules.minLength(6, 'New password must be at least 6 characters long')
    ]
  }),
  asyncHandler(AuthController.changePassword)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token deletion)
 * @access  Private
 */
router.post('/logout',
  authenticateToken,
  logAuthEvent('LOGOUT'),
  (req, res) => {
    // Since we're using stateless JWT, logout is handled client-side
    // This endpoint can be used for logging purposes
    res.json({ 
      success: true, 
      message: 'Logged out successfully. Please delete the token from client storage.' 
    });
  }
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile',
  authenticateToken,
  (req, res) => {
    // Return user info from the JWT token
    const { userId, email, username } = req.user;
    res.json({
      success: true,
      user: {
        id: userId,
        email,
        username
      }
    });
  }
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile',
  authenticateToken,
  validate({
    email: [
      rules.string(),
      rules.email()
    ],
    username: [
      rules.string(),
      rules.minLength(3, 'Username must be at least 3 characters long'),
      rules.maxLength(30, 'Username must be no more than 30 characters long')
    ]
  }),
  asyncHandler(async (req, res) => {
    // This would need to be implemented in the AuthController
    // For now, return a placeholder response
    res.status(501).json({
      error: 'Profile update not yet implemented',
      message: 'This feature will be available in a future update'
    });
  })
);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account and all associated data
 * @access  Private
 */
router.delete('/account',
  authenticateToken,
  authRateLimit,
  logAuthEvent('ACCOUNT_DELETION_ATTEMPT'),
  validate({
    password: [
      rules.required('Password confirmation is required for account deletion'),
      rules.string()
    ]
  }),
  asyncHandler(async (req, res) => {
    // This would need to be implemented in the AuthController
    // For now, return a placeholder response
    res.status(501).json({
      error: 'Account deletion not yet implemented',
      message: 'This feature will be available in a future update'
    });
  })
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private
 */
router.post('/refresh',
  authenticateToken,
  logAuthEvent('TOKEN_REFRESH'),
  asyncHandler(async (req, res) => {
    const jwt = require('jsonwebtoken');
    const appConfig = require('../config/app.config');
    
    try {
      // Generate new token with updated expiration
      const newToken = jwt.sign(
        { 
          userId: req.user.userId, 
          email: req.user.email, 
          username: req.user.username 
        },
        appConfig.jwt.secret,
        { expiresIn: appConfig.jwt.expiresIn }
      );
      
      res.json({
        success: true,
        token: newToken,
        message: 'Token refreshed successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to refresh token',
        message: 'Please login again'
      });
    }
  })
);

module.exports = router;