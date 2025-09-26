// Add this line at the very top
require('dotenv').config();

const mysql = require('mysql2/promise');

const dbConfig = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sportsbook_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
  },
  production: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4',
    ssl: process.env.DB_SSL === 'true' ? {
      rejectUnauthorized: false
    } : false
  },
  test: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_TEST_NAME || 'sportsbook_tracker_test',
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4'
  }
};

const environment = process.env.NODE_ENV || 'development';
const config = dbConfig[environment];

// Add some debug logging to verify the config is loaded correctly
console.log('Environment:', environment);
console.log('Database config loaded:', {
  host: config.host,
  user: config.user,
  database: config.database,
  passwordSet: !!config.password // Only log if password exists, not the actual password
});

// Create connection pool
const pool = mysql.createPool(config);

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Database connected successfully (${environment})`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
};

// Initialize database
const initializeDatabase = async () => {
  try {
    await testConnection();
    
    // Create database if it doesn't exist (development only)
    if (environment === 'development') {
      const connection = await pool.getConnection();
      await connection.execute(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
      await connection.execute(`USE ${config.database}`);
      connection.release();
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
};

module.exports = {
  pool,
  config,
  database: config.database, // Add this line for app.js compatibility
  testConnection,
  initializeDatabase
};