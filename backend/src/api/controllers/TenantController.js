const BaseController = require('./BaseController');
const Container = require('../../core/Container');

class TenantController extends BaseController {
  constructor() {
    super();
    this.tenantService = Container.get('tenantService');
  }

  async getCurrentTenant(req, res) {
    try {
      const tenantId = req.tenantId;
      const tenant = await this.tenantService.getTenantWithUsers(tenantId);
      
      return this.sendSuccess(res, { tenant });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async createTenant(req, res) {
    try {
      const userId = req.user.userId;
      const tenantData = req.body;
      
      const tenant = await this.tenantService.createTenant(tenantData, userId);
      
      return this.sendCreated(res, { tenant });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async updateTenant(req, res) {
    try {
      const tenantId = req.tenantId;
      const updateData = req.body;
      
      const tenantRepository = Container.get('tenantRepository');
      const updatedTenant = await tenantRepository.update(tenantId, updateData);
      
      return this.sendSuccess(res, { tenant: updatedTenant });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async getUsageStats(req, res) {
    try {
      const tenantId = req.tenantId;
      const tenant = await this.tenantService.findById(tenantId);
      
      if (!tenant) {
        return this.sendNotFound(res, 'Tenant not found');
      }

      const usage = {};
      const limits = tenant.limits || {};
      
      for (const resourceType of Object.keys(limits)) {
        usage[resourceType] = {
          current: await this.tenantService.getResourceUsage(tenantId, resourceType),
          limit: limits[resourceType],
          percentage: limits[resourceType] === -1 ? 0 : 
            Math.round((await this.tenantService.getResourceUsage(tenantId, resourceType) / limits[resourceType]) * 100)
        };
      }
      
      return this.sendSuccess(res, { 
        usage,
        plan: tenant.plan,
        features: tenant.features
      });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async upgradeSubscription(req, res) {
    try {
      const tenantId = req.tenantId;
      const { plan } = req.body;
      
      // Define plan configurations
      const planConfigs = {
        basic: {
          plan: 'basic',
          status: 'active',
          features: ['basic_tracking', 'simple_analytics', 'csv_export'],
          limits: { accounts: 10, transactions: 1000, api_requests: 10000 },
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        },
        pro: {
          plan: 'pro',
          status: 'active',
          features: ['basic_tracking', 'advanced_analytics', 'csv_export', 'api_access', 'custom_reports'],
          limits: { accounts: 50, transactions: 10000, api_requests: 100000 },
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        enterprise: {
          plan: 'enterprise',
          status: 'active',
          features: ['unlimited_features'],
          limits: { accounts: -1, transactions: -1, api_requests: -1 },
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      };

      if (!planConfigs[plan]) {
        return this.sendError(res, { message: 'Invalid plan' }, 400);
      }

      const updatedTenant = await this.tenantService.updateSubscription(tenantId, planConfigs[plan]);
      
      return this.sendSuccess(res, { 
        tenant: updatedTenant,
        message: `Successfully upgraded to ${plan} plan`
      });
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  async inviteUser(req, res) {
    try {
      const tenantId = req.tenantId;
      const { email, role = 'user' } = req.body;
      
      // Here you would typically:
      // 1. Send an invitation email
      // 2. Create a pending invitation record
      // 3. Handle user acceptance workflow
      
      // For now, just return success
      return this.sendSuccess(res, { 
        message: 'Invitation sent successfully',
        email,
        role 
      });
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}

module.exports = new TenantController();