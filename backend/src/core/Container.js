const { pool } = require('../config/database.config');

// Repositories
const AccountRepository = require('./repositories/AccountRepository');
const TenantRepository = require('./repositories/TenantRepository');

// Services  
const AccountService = require('./services/AccountService');
const TenantService = require('./services/TenantService');
const CacheService = require('../infrastructure/cache/CacheService');

class Container {
  constructor() {
    this.services = new Map();
    this.instances = new Map();
    this._registerServices();
  }

  _registerServices() {
    // Infrastructure
    this.register('database', () => pool, true);
    this.register('cacheService', () => new CacheService(), true);

    // Repositories
    this.register('accountRepository', () => {
      const database = this.get('database');
      return new AccountRepository(database);
    });

    this.register('tenantRepository', () => {
      const database = this.get('database');
      return new TenantRepository(database);
    });

    // Services
    this.register('tenantService', () => {
      const tenantRepository = this.get('tenantRepository');
      const cacheService = this.get('cacheService');
      return new TenantService(tenantRepository, cacheService);
    }, true);

    this.register('accountService', () => {
      const accountRepository = this.get('accountRepository');
      const cacheService = this.get('cacheService');
      return new AccountService(accountRepository, null, cacheService);
    });
  }

  register(name, factory, singleton = false) {
    this.services.set(name, { factory, singleton });
  }

  get(name) {
    const service = this.services.get(name);
    
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    if (service.singleton && this.instances.has(name)) {
      return this.instances.get(name);
    }

    const instance = service.factory();
    
    if (service.singleton) {
      this.instances.set(name, instance);
    }

    return instance;
  }
}

module.exports = new Container();