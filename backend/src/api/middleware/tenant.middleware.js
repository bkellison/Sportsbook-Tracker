const Container = require('../../core/Container');
const { UnauthorizedError, ForbiddenError } = require('../../shared/errors');

class TenantMiddleware {
  static async extractTenant(req, res, next) {
    try {
      const tenantService = Container.get('tenantService');
      let tenantId = null;
      let tenant = null;
      
      // Method 1: Subdomain extraction (tenant.yoursaas.com)
      const hostname = req.get('host') || req.hostname || '';
      const subdomain = hostname.split('.')[0];
      
      if (subdomain && subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'localhost') {
        tenant = await tenantService.findBySubdomain(subdomain);
        if (tenant) {
          tenantId = tenant.id;
        }
      }
      
      // Method 2: Custom header (for API access)
      if (!tenantId && req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
        tenant = await tenantService.findById(tenantId);
      }
      
      // Method 3: JWT token claims (from user's default tenant)
      if (!tenantId && req.user && req.user.defaultTenantId) {
        tenantId = req.user.defaultTenantId;
        tenant = await tenantService.findById(tenantId);
      }
      
      // Method 4: Default tenant for development/legacy support
      if (!tenantId) {
        tenantId = 1; // Default tenant ID
        tenant = await tenantService.findById(tenantId);
      }
      
      if (!tenant) {
        throw new ForbiddenError('Tenant not found or inactive');
      }
      
      // Check tenant status
      if (tenant.status !== 'active') {
        throw new ForbiddenError('Tenant is not active');
      }
      
      // Check subscription status
      if (tenant.subscription_status === 'canceled' || tenant.subscription_status === 'past_due') {
        throw new ForbiddenError('Subscription expired or suspended');
      }
      
      // Attach tenant to request
      req.tenant = tenant;
      req.tenantId = tenantId;
      
      next();
    } catch (error) {
      next(error);
    }
  }
  
  static checkFeatureAccess(feature) {
    return (req, res, next) => {
      const { tenant } = req;
      
      if (!tenant || !tenant.features.includes(feature)) {
        return res.status(403).json({
          success: false,
          error: 'Feature not available in your plan',
          feature,
          currentPlan: tenant?.plan,
          availableFeatures: tenant?.features || []
        });
      }
      
      next();
    };
  }
  
  static checkResourceLimits(resource) {
    return async (req, res, next) => {
      try {
        const tenantService = Container.get('tenantService');
        const { tenantId } = req;
        
        const limitCheck = await tenantService.checkResourceLimit(tenantId, resource);
        
        if (!limitCheck.allowed) {
          return res.status(429).json({
            success: false,
            error: `Resource limit exceeded for ${resource}`,
            usage: limitCheck.usage,
            limit: limitCheck.limit,
            upgradeRequired: true
          });
        }
        
        // Attach limit info to request for tracking
        req.resourceLimits = req.resourceLimits || {};
        req.resourceLimits[resource] = limitCheck;
        
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  static async trackResourceUsage(req, res, next) {
    // Middleware to track resource usage after successful operations
    const originalSend = res.send;
    
    res.send = function(body) {
      // Only track on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(async () => {
          try {
            const tenantService = Container.get('tenantService');
            const { tenantId, method, route } = req;
            
            // Track API requests
            await tenantService.incrementResourceUsage(tenantId, 'api_requests', 1);
            
            // Track specific resources based on route
            if (method === 'POST') {
              if (route?.path === '/accounts') {
                await tenantService.incrementResourceUsage(tenantId, 'accounts', 1);
              } else if (route?.path === '/transactions') {
                await tenantService.incrementResourceUsage(tenantId, 'transactions', 1);
              }
            }
          } catch (error) {
            console.error('Error tracking resource usage:', error);
          }
        });
      }
      
      originalSend.call(this, body);
    };
    
    next();
  }
}

module.exports = TenantMiddleware;