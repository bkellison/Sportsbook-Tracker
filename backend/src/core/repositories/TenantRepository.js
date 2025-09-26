const BaseRepository = require('./BaseRepository');

class TenantRepository extends BaseRepository {
  constructor(database) {
    super(database, 'tenants');
  }

  async findBySubdomain(subdomain) {
    const connection = await this.db.getConnection();
    try {
      const [tenants] = await connection.execute(
        `SELECT t.*, sp.features as plan_features, sp.limits as plan_limits
         FROM ${this.tableName} t
         LEFT JOIN subscription_plans sp ON t.plan = sp.name
         WHERE t.subdomain = ? AND t.status = 'active'`,
        [subdomain]
      );
      
      if (tenants.length === 0) return null;
      
      const tenant = tenants[0];
      return {
        ...tenant,
        features: this.parseJSON(tenant.features) || this.parseJSON(tenant.plan_features) || [],
        limits: this.parseJSON(tenant.limits) || this.parseJSON(tenant.plan_limits) || {},
        settings: this.parseJSON(tenant.settings) || {}
      };
    } finally {
      connection.release();
    }
  }

  async findWithUsers(tenantId) {
    const connection = await this.db.getConnection();
    try {
      // Get tenant
      const [tenants] = await connection.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [tenantId]
      );
      
      if (tenants.length === 0) return null;
      
      // Get tenant users
      const [users] = await connection.execute(
        `SELECT u.id, u.email, u.username, tu.role, tu.status, tu.joined_at
         FROM tenant_users tu
         JOIN users u ON tu.user_id = u.id
         WHERE tu.tenant_id = ?
         ORDER BY tu.role, u.username`,
        [tenantId]
      );
      
      const tenant = tenants[0];
      return {
        ...tenant,
        features: this.parseJSON(tenant.features) || [],
        limits: this.parseJSON(tenant.limits) || {},
        settings: this.parseJSON(tenant.settings) || {},
        users
      };
    } finally {
      connection.release();
    }
  }

  async getResourceUsage(tenantId, resourceType, periodStart = null, periodEnd = null) {
    const connection = await this.db.getConnection();
    try {
      // If no period specified, get current month
      if (!periodStart) {
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const [usage] = await connection.execute(
        `SELECT resource_count FROM usage_tracking 
         WHERE tenant_id = ? AND resource_type = ? 
         AND period_start <= ? AND period_end >= ?`,
        [tenantId, resourceType, periodEnd, periodStart]
      );

      return usage.length > 0 ? usage[0].resource_count : 0;
    } finally {
      connection.release();
    }
  }

  async updateResourceUsage(tenantId, resourceType, increment = 1) {
    const connection = await this.db.getConnection();
    try {
      const now = new Date();
      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      await connection.execute(
        `INSERT INTO usage_tracking (tenant_id, resource_type, resource_count, period_start, period_end)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         resource_count = resource_count + ?, 
         updated_at = CURRENT_TIMESTAMP`,
        [tenantId, resourceType, increment, periodStart, periodEnd, increment]
      );

      return true;
    } finally {
      connection.release();
    }
  }

  async createTenantSchema(tenantId) {
    // For schema-based isolation (optional implementation)
    const connection = await this.db.getConnection();
    try {
      await connection.execute(`CREATE SCHEMA IF NOT EXISTS tenant_${tenantId}`);
      return true;
    } finally {
      connection.release();
    }
  }

  async addUserToTenant(tenantId, userId, role = 'user') {
    const connection = await this.db.getConnection();
    try {
      const [result] = await connection.execute(
        `INSERT INTO tenant_users (tenant_id, user_id, role, status, joined_at)
         VALUES (?, ?, ?, 'active', NOW())
         ON DUPLICATE KEY UPDATE 
         role = VALUES(role), 
         status = 'active',
         joined_at = NOW()`,
        [tenantId, userId, role]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  async removeUserFromTenant(tenantId, userId) {
    const connection = await this.db.getConnection();
    try {
      const [result] = await connection.execute(
        `DELETE FROM tenant_users WHERE tenant_id = ? AND user_id = ?`,
        [tenantId, userId]
      );

      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  }

  parseJSON(jsonString) {
    try {
      return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch (error) {
      return null;
    }
  }
}

module.exports = TenantRepository;