const mysql = require('mysql2/promise');

class DatabaseUtils {
  constructor() {
    this.pool = null;
  }

  /**
   * Initialize database connection pool
   */
  createPool(config) {
    // Clean the config to remove invalid options for mysql2
    const cleanConfig = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: config.waitForConnections,
      connectionLimit: config.connectionLimit,
      queueLimit: config.queueLimit,
      charset: config.charset,
      timezone: config.timezone || 'Z'
    };

    // Add SSL if specified
    if (config.ssl) {
      cleanConfig.ssl = config.ssl;
    }

    console.log('Creating pool with config:', {
      host: cleanConfig.host,
      port: cleanConfig.port,
      user: cleanConfig.user,
      database: cleanConfig.database,
      passwordSet: !!cleanConfig.password
    });

    this.pool = mysql.createPool(cleanConfig);

    // Handle pool events
    this.pool.on('connection', (connection) => {
      console.log(`Database connection established as id ${connection.threadId}`);
    });

    this.pool.on('error', (err) => {
      console.error('Database pool error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Attempting to reconnect to database...');
        this.handleDisconnect();
      } else {
        throw err;
      }
    });

    return this.pool;
  }

  /**
   * Handle database disconnection
   */
  handleDisconnect() {
    setTimeout(() => {
      console.log('Reconnecting to database...');
      // Pool will automatically create new connections
    }, 2000);
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      if (!this.pool) {
        console.error('No database pool available');
        return false;
      }

      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();
      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async executeQuery(query, params = []) {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();
    try {
      const [results] = await connection.execute(query, params);
      return results;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async executeTransaction(queries) {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results = [];
      for (const { query, params } of queries) {
        const [result] = await connection.execute(query, params);
        results.push(result);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      console.error('Transaction error:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Build WHERE clause from filters
   */
  buildWhereClause(filters, tablePrefixes = {}) {
    if (!filters || Object.keys(filters).length === 0) {
      return { whereClause: '', params: [] };
    }

    const conditions = [];
    const params = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        const prefix = tablePrefixes[key] || '';
        const column = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value)) {
          // IN clause
          const placeholders = value.map(() => '?').join(',');
          conditions.push(`${column} IN (${placeholders})`);
          params.push(...value);
        } else if (typeof value === 'object' && value.operator) {
          // Custom operator
          conditions.push(`${column} ${value.operator} ?`);
          params.push(value.value);
        } else {
          // Equals
          conditions.push(`${column} = ?`);
          params.push(value);
        }
      }
    });

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    return { whereClause, params };
  }

  /**
   * Build ORDER BY clause
   */
  buildOrderByClause(sortBy, sortOrder = 'DESC', allowedColumns = []) {
    if (!sortBy) return '';
    
    // Security: only allow whitelisted columns
    if (allowedColumns.length > 0 && !allowedColumns.includes(sortBy)) {
      return '';
    }

    const order = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? 
      sortOrder.toUpperCase() : 'DESC';

    return `ORDER BY ${sortBy} ${order}`;
  }

  /**
   * Build LIMIT clause with offset
   */
  buildLimitClause(page = 1, limit = 10) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 1000); // Max 1000 records
    const offset = (pageNum - 1) * limitNum;

    return {
      limitClause: `LIMIT ${limitNum} OFFSET ${offset}`,
      pagination: {
        page: pageNum,
        limit: limitNum,
        offset
      }
    };
  }

  /**
   * Count total records for pagination
   */
  async getTotalCount(baseQuery, params = []) {
    // Extract the main query without ORDER BY and LIMIT
    const countQuery = baseQuery
      .replace(/ORDER BY.*$/i, '')
      .replace(/LIMIT.*$/i, '')
      .replace(/^SELECT.*FROM/i, 'SELECT COUNT(*) as total FROM');

    const [results] = await this.pool.execute(countQuery, params);
    return results[0].total;
  }

  /**
   * Safely escape column names
   */
  escapeColumn(columnName) {
    // Remove any non-alphanumeric characters except underscore and dot
    const cleaned = columnName.replace(/[^a-zA-Z0-9_\.]/g, '');
    return cleaned.split('.').map(part => `\`${part}\``).join('.');
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Check if table exists
   */
  async tableExists(tableName) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() AND table_name = ?
      `;
      const [results] = await this.pool.execute(query, [tableName]);
      return results[0].count > 0;
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(tableName) {
    try {
      const query = `
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          COLUMN_KEY,
          EXTRA
        FROM information_schema.columns 
        WHERE table_schema = DATABASE() AND table_name = ?
        ORDER BY ORDINAL_POSITION
      `;
      const [results] = await this.pool.execute(query, [tableName]);
      return results;
    } catch (error) {
      console.error('Error getting table schema:', error);
      return [];
    }
  }

  /**
   * Create database backup
   */
  async createBackup(tables = []) {
    try {
      const backupData = {};
      
      // If no tables specified, get all tables
      if (tables.length === 0) {
        const [allTables] = await this.pool.execute(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
        );
        tables = allTables.map(row => row.table_name);
      }

      // Export data from each table
      for (const table of tables) {
        const [data] = await this.pool.execute(`SELECT * FROM \`${table}\``);
        backupData[table] = data;
      }

      return {
        timestamp: new Date().toISOString(),
        tables: Object.keys(backupData),
        data: backupData
      };
    } catch (error) {
      console.error('Backup creation error:', error);
      throw error;
    }
  }

  /**
   * Optimize database tables
   */
  async optimizeTables(tables = []) {
    try {
      const results = [];
      
      if (tables.length === 0) {
        const [allTables] = await this.pool.execute(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()"
        );
        tables = allTables.map(row => row.table_name);
      }

      for (const table of tables) {
        const [result] = await this.pool.execute(`OPTIMIZE TABLE \`${table}\``);
        results.push({
          table,
          result: result[0]
        });
      }

      return results;
    } catch (error) {
      console.error('Table optimization error:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const stats = {};

      // Get table sizes
      const [tableSizes] = await this.pool.execute(`
        SELECT 
          table_name,
          ROUND(((data_length + index_length) / 1024 / 1024), 2) AS size_mb,
          table_rows
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
        ORDER BY (data_length + index_length) DESC
      `);

      stats.tables = tableSizes;

      // Get connection info
      const [connections] = await this.pool.execute("SHOW STATUS LIKE 'Threads_connected'");
      const [maxConnections] = await this.pool.execute("SHOW VARIABLES LIKE 'max_connections'");
      
      stats.connections = {
        current: parseInt(connections[0].Value),
        max: parseInt(maxConnections[0].Value)
      };

      // Get database size
      const [dbSize] = await this.pool.execute(`
        SELECT 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS db_size_mb
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);

      stats.totalSize = dbSize[0].db_size_mb;

      return stats;
    } catch (error) {
      console.error('Error getting database stats:', error);
      return null;
    }
  }

  /**
   * Clean up old records
   */
  async cleanupOldRecords(tableName, dateColumn, daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const query = `DELETE FROM \`${tableName}\` WHERE \`${dateColumn}\` < ?`;
      const [result] = await this.pool.execute(query, [cutoffDate]);
      
      return {
        table: tableName,
        recordsDeleted: result.affectedRows,
        cutoffDate: cutoffDate.toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Cleanup error:', error);
      throw error;
    }
  }

  /**
   * Close database connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('Database connection pool closed');
    }
  }

  /**
   * Health check for database
   */
  async healthCheck() {
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }

      const connection = await this.pool.getConnection();
      const start = Date.now();
      
      await connection.execute('SELECT 1');
      
      const responseTime = Date.now() - start;
      connection.release();

      return {
        status: 'healthy',
        responseTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute raw SQL (use with caution)
   */
  async executeRawSQL(sql, params = []) {
    console.warn('Executing raw SQL:', sql.substring(0, 100) + '...');
    return await this.executeQuery(sql, params);
  }

  /**
   * Get current database connection info
   */
  getPoolInfo() {
    if (!this.pool) return null;

    return {
      totalConnections: this.pool.pool._allConnections.length,
      freeConnections: this.pool.pool._freeConnections.length,
      usedConnections: this.pool.pool._allConnections.length - this.pool.pool._freeConnections.length,
      queuedRequests: this.pool.pool._connectionQueue.length
    };
  }
}

module.exports = new DatabaseUtils();