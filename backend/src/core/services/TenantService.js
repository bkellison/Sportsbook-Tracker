const { NotFoundError, BusinessLogicError } = require('../../shared/errors');
const Logger = require('../../infrastructure/logging/Logger');

class TenantService {
  constructor(tenantRepository, cacheService) {
    this.tenantRepository = tenantRepository;
    this.cache = cacheService;
    this.logger = Logger.getInstance();
  }

  async findById(tenantId) {
    const cacheKey = `tenant:${tenantId}`;
    
    let tenant = await this.cache.get(cacheKey);
    if (!tenant) {
      tenant = await this.tenantRepository.findById(tenantId);
      if (tenant) {
        await this.cache.set(cacheKey, tenant, 3600); // Cache for 1 hour
      }
    }
    
    return tenant;
  }

  async findBySubdomain(subdomain) {
    const cacheKey = `tenant:subdomain:${subdomain}`;
    
    let tenant = await this.cache.get(cacheKey);
    if (!tenant) {
      tenant = await this.tenantRepository.findBySubdomain(subdomain);
      if (tenant) {
        await this.cache.set(cacheKey, tenant, 3600);
      }
    }
    
    return tenant;
  }

  async createTenant(tenantData, ownerId) {
    // Validate subdomain availability
    const existingTenant = await this.tenantRepository.findBySubdomain(tenantData.subdomain);
    if (existingTenant) {
      throw new BusinessLogicError('Subdomain already taken');
    }

    // Create tenant
    const tenant = await this.tenantRepository.create({
      name: tenantData.name,
      subdomain: tenantData.subdomain,
      domain: tenantData.domain,
      status: 'active',
      subscription_status: 'trial',
      plan: 'trial',
      features: JSON.stringify(['basic_tracking', 'simple_analytics']),
      limits: JSON.stringify({
        accounts: 3,
        transactions: 100,
        api_requests: 1000
      }),
      settings: JSON.stringify({
        theme: 'default',
        timezone: 'UTC',
        currency: 'USD'
      }),
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      created_at: new Date()
    });

    // Add owner to tenant
    await this.tenantRepository.addUserToTenant(tenant.id, ownerId, 'owner');

    // Create tenant schema if using schema-based isolation
    await this.tenantRepository.createTenantSchema(tenant.id);

    this.logger.info('Tenant created', { 
      tenantId: tenant.id, 
      subdomain: tenant.subdomain,
      ownerId 
    });

    return tenant;
  }

  async getResourceUsage(tenantId, resourceType) {
    const cacheKey = `tenant:${tenantId}:usage:${resourceType}`;
    
    let usage = await this.cache.get(cacheKey);
    if (usage === null) {
      usage = await this.tenantRepository.getResourceUsage(tenantId, resourceType);
      await this.cache.set(cacheKey, usage, 300); // Cache for 5 minutes
    }
    
    return usage;
  }

  async incrementResourceUsage(tenantId, resourceType, increment = 1) {
    await this.tenantRepository.updateResourceUsage(tenantId, resourceType, increment);
    
    // Clear cache
    await this.cache.delete(`tenant:${tenantId}:usage:${resourceType}`);
    
    this.logger.info('Resource usage updated', { 
      tenantId, 
      resourceType, 
      increment 
    });
  }

  async checkResourceLimit(tenantId, resourceType) {
    const tenant = await this.findById(tenantId);
    if (!tenant) {
      throw new NotFoundError('Tenant not found');
    }

    const limits = tenant.limits || {};
    const limit = limits[resourceType];
    
    // -1 means unlimited
    if (limit === -1) return { allowed: true, usage: 0, limit: -1 };
    
    const usage = await this.getResourceUsage(tenantId, resourceType);
    const allowed = usage < limit;
    
    return { allowed, usage, limit };
  }

  async updateSubscription(tenantId, subscriptionData) {
    const tenant = await this.tenantRepository.update(tenantId, {
      plan: subscriptionData.plan,
      subscription_status: subscriptionData.status,
      features: JSON.stringify(subscriptionData.features),
      limits: JSON.stringify(subscriptionData.limits),
      subscription_ends_at: subscriptionData.endsAt,
      updated_at: new Date()
    });

    // Clear caches
    await this.cache.delete(`tenant:${tenantId}`);
    await this.cache.deletePattern(`tenant:${tenantId}:*`);
    
    this.logger.info('Subscription updated', { tenantId, plan: subscriptionData.plan });
    
    return tenant;
  }

  async getTenantWithUsers(tenantId) {
    const cacheKey = `tenant:${tenantId}:with_users`;
    
    let tenant = await this.cache.get(cacheKey);
    if (!tenant) {
      tenant = await this.tenantRepository.findWithUsers(tenantId);
      if (tenant) {
        await this.cache.set(cacheKey, tenant, 1800); // Cache for 30 minutes
      }
    }
    
    return tenant;
  }
}

module.exports = TenantService;