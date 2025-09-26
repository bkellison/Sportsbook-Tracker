-- Create tenants table
CREATE TABLE tenants (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  subscription_status ENUM('trial', 'active', 'past_due', 'canceled', 'paused') DEFAULT 'trial',
  plan ENUM('trial', 'basic', 'pro', 'enterprise') DEFAULT 'trial',
  features JSON,
  limits JSON,
  settings JSON,
  trial_ends_at DATETIME,
  subscription_ends_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_subdomain (subdomain),
  INDEX idx_status (status),
  INDEX idx_subscription_status (subscription_status)
);

-- Create tenant_users table (many-to-many relationship)
CREATE TABLE tenant_users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'admin', 'user', 'viewer') DEFAULT 'user',
  status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
  invited_by INT,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  joined_at TIMESTAMP NULL,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  
  UNIQUE KEY unique_tenant_user (tenant_id, user_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_user_id (user_id)
);

-- Create subscription_plans table
CREATE TABLE subscription_plans (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle ENUM('monthly', 'yearly') NOT NULL,
  features JSON NOT NULL,
  limits JSON NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_active (is_active)
);

-- Create usage_tracking table
CREATE TABLE usage_tracking (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tenant_id INT NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_count INT NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_tenant_resource_period (tenant_id, resource_type, period_start),
  INDEX idx_tenant_resource (tenant_id, resource_type),
  INDEX idx_period (period_start, period_end)
);

-- Add tenant_id to existing tables
ALTER TABLE users ADD COLUMN default_tenant_id INT NULL;
ALTER TABLE users ADD FOREIGN KEY (default_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

ALTER TABLE accounts ADD COLUMN tenant_id INT NOT NULL DEFAULT 1;
ALTER TABLE accounts ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE accounts ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE transactions ADD COLUMN tenant_id INT NOT NULL DEFAULT 1;
ALTER TABLE transactions ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE transactions ADD INDEX idx_tenant_id (tenant_id);

ALTER TABLE bets ADD COLUMN tenant_id INT NOT NULL DEFAULT 1;
ALTER TABLE bets ADD FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE bets ADD INDEX idx_tenant_id (tenant_id);

-- Insert default subscription plans
INSERT INTO subscription_plans (name, price, billing_cycle, features, limits) VALUES
('Trial', 0.00, 'monthly', 
 '["basic_tracking", "simple_analytics"]',
 '{"accounts": 3, "transactions": 100, "api_requests": 1000}'),

('Basic', 9.99, 'monthly', 
 '["basic_tracking", "simple_analytics", "csv_export"]',
 '{"accounts": 10, "transactions": 1000, "api_requests": 10000}'),

('Pro', 29.99, 'monthly', 
 '["basic_tracking", "advanced_analytics", "csv_export", "api_access", "custom_reports"]',
 '{"accounts": 50, "transactions": 10000, "api_requests": 100000}'),

('Enterprise', 99.99, 'monthly', 
 '["unlimited_features"]',
 '{"accounts": -1, "transactions": -1, "api_requests": -1}');

-- Create default tenant for existing data
INSERT INTO tenants (name, subdomain, status, subscription_status, plan, features, limits, trial_ends_at) VALUES
('Default Tenant', 'app', 'active', 'active', 'enterprise',
 '["unlimited_features"]',
 '{"accounts": -1, "transactions": -1, "api_requests": -1}',
 DATE_ADD(NOW(), INTERVAL 30 DAY));

-- Update existing data to belong to default tenant
UPDATE accounts SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE transactions SET tenant_id = 1 WHERE tenant_id IS NULL;
UPDATE bets SET tenant_id = 1 WHERE tenant_id IS NULL;

-- Assign existing users to default tenant
INSERT INTO tenant_users (tenant_id, user_id, role, status, joined_at)
SELECT 1, id, 'owner', 'active', NOW() FROM users;

UPDATE users SET default_tenant_id = 1 WHERE default_tenant_id IS NULL;