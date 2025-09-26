const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class Helpers {
  /**
   * Format currency amount
   */
  formatCurrency(amount, currency = 'USD', decimals = 2) {
    const num = parseFloat(amount);
    if (isNaN(num)) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }

  /**
   * Format percentage
   */
  formatPercentage(value, decimals = 1) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.0%';
    
    return `${num.toFixed(decimals)}%`;
  }

  /**
   * Format large numbers with abbreviations
   */
  formatNumber(num, decimals = 1) {
    const number = parseFloat(num);
    if (isNaN(number)) return '0';
    
    const abbreviations = [
      { value: 1e9, symbol: 'B' },
      { value: 1e6, symbol: 'M' },
      { value: 1e3, symbol: 'K' }
    ];
    
    for (const abbr of abbreviations) {
      if (Math.abs(number) >= abbr.value) {
        return (number / abbr.value).toFixed(decimals) + abbr.symbol;
      }
    }
    
    return number.toLocaleString();
  }

  /**
   * Calculate time ago from date
   */
  timeAgo(date) {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    
    const units = [
      { name: 'year', ms: 365 * 24 * 60 * 60 * 1000 },
      { name: 'month', ms: 30 * 24 * 60 * 60 * 1000 },
      { name: 'week', ms: 7 * 24 * 60 * 60 * 1000 },
      { name: 'day', ms: 24 * 60 * 60 * 1000 },
      { name: 'hour', ms: 60 * 60 * 1000 },
      { name: 'minute', ms: 60 * 1000 },
      { name: 'second', ms: 1000 }
    ];
    
    for (const unit of units) {
      const diff = Math.floor(diffMs / unit.ms);
      if (diff > 0) {
        return `${diff} ${unit.name}${diff > 1 ? 's' : ''} ago`;
      }
    }
    
    return 'just now';
  }

  /**
   * Calculate date range
   */
  getDateRange(period) {
    const end = new Date();
    const start = new Date();
    
    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setDate(start.getDate() - 30);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  /**
   * Generate random string
   */
  generateRandomString(length = 32, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generate secure token
   */
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash string with salt
   */
  hashWithSalt(str, salt = null) {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(str, useSalt, 10000, 64, 'sha512').toString('hex');
    return {
      hash,
      salt: useSalt
    };
  }

  /**
   * Deep clone object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      Object.keys(obj).forEach(key => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  }

  /**
   * Merge objects deeply
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    Object.keys(source).forEach(key => {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });
    
    return result;
  }

  /**
   * Get nested object property safely
   */
  getNestedProperty(obj, path, defaultValue = undefined) {
    return path.split('.').reduce((current, key) => {
      return (current && current[key] !== undefined) ? current[key] : defaultValue;
    }, obj);
  }

  /**
   * Set nested object property
   */
  setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
    return obj;
  }

  /**
   * Remove empty properties from object
   */
  removeEmptyProperties(obj) {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object' && !Array.isArray(value)) {
          const cleanedNested = this.removeEmptyProperties(value);
          if (Object.keys(cleanedNested).length > 0) {
            cleaned[key] = cleanedNested;
          }
        } else {
          cleaned[key] = value;
        }
      }
    });
    return cleaned;
  }

  /**
   * Sanitize string for safe output
   */
  sanitizeString(str) {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/[<>&"']/g, (match) => {
        const map = {
          '<': '&lt;',
          '>': '&gt;',
          '&': '&amp;',
          '"': '&quot;',
          "'": '&#39;'
        };
        return map[match];
      });
  }

  /**
   * Truncate string with ellipsis
   */
  truncateString(str, maxLength = 100, ellipsis = '...') {
    if (typeof str !== 'string') return str;
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - ellipsis.length) + ellipsis;
  }

  /**
   * Convert string to slug
   */
  slugify(str) {
    return str
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  /**
   * Parse CSV string
   */
  parseCSV(csvString, delimiter = ',') {
    const lines = csvString.trim().split('\n');
    const headers = lines[0].split(delimiter).map(h => h.trim());
    
    return lines.slice(1).map(line => {
      const values = line.split(delimiter).map(v => v.trim());
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });
  }

  /**
   * Convert array to CSV string
   */
  arrayToCSV(array, headers = null) {
    if (!Array.isArray(array) || array.length === 0) return '';
    
    const useHeaders = headers || Object.keys(array[0]);
    const csvHeaders = useHeaders.join(',');
    
    const csvRows = array.map(row => {
      return useHeaders.map(header => {
        const value = row[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Retry function with exponential backoff
   */
  async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) break;
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Debounce function
   */
  debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      
      if (callNow) func(...args);
    };
  }

  /**
   * Throttle function
   */
  throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Calculate statistics from array of numbers
   */
  calculateStats(numbers) {
    if (!Array.isArray(numbers) || numbers.length === 0) {
      return {
        count: 0,
        sum: 0,
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        mode: null,
        variance: 0,
        standardDeviation: 0
      };
    }
    
    const sorted = numbers.slice().sort((a, b) => a - b);
    const count = numbers.length;
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    
    // Median
    const median = count % 2 === 0 
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
    
    // Mode
    const frequency = {};
    numbers.forEach(num => frequency[num] = (frequency[num] || 0) + 1);
    let mode = null;
    let maxFreq = 0;
    Object.entries(frequency).forEach(([num, freq]) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = parseFloat(num);
      }
    });
    
    // Variance and standard deviation
    const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      count,
      sum,
      min: sorted[0],
      max: sorted[count - 1],
      mean,
      median,
      mode: maxFreq > 1 ? mode : null,
      variance,
      standardDeviation
    };
  }

  /**
   * Generate pagination metadata
   */
  getPaginationMeta(page, limit, totalCount) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;
    
    return {
      page: pageNum,
      limit: limitNum,
      totalCount,
      totalPages,
      hasNext,
      hasPrev,
      nextPage: hasNext ? pageNum + 1 : null,
      prevPage: hasPrev ? pageNum - 1 : null,
      offset: (pageNum - 1) * limitNum
    };
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate color palette
   */
  generateColorPalette(count = 10) {
    const colors = [];
    for (let i = 0; i < count; i++) {
      const hue = (i * 137.508) % 360; // Golden angle approximation
      colors.push({
        hsl: `hsl(${Math.round(hue)}, 70%, 50%)`,
        hex: this.hslToHex(hue, 70, 50)
      });
    }
    return colors;
  }

  /**
   * Convert HSL to HEX
   */
  hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  /**
   * Log with timestamp and color
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      warn: '\x1b[33m',    // Yellow
      error: '\x1b[31m',   // Red
      success: '\x1b[32m', // Green
      debug: '\x1b[35m'    // Magenta
    };
    const reset = '\x1b[0m';
    
    console.log(`${colors[level] || colors.info}[${timestamp}] ${level.toUpperCase()}: ${message}${reset}`);
  }

  /**
   * Create directory if it doesn't exist
   */
  async ensureDirectory(dirPath) {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Read JSON file safely
   */
  async readJSONFile(filePath, defaultValue = {}) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  /**
   * Write JSON file safely
   */
  async writeJSONFile(filePath, data, pretty = true) {
    await this.ensureDirectory(path.dirname(filePath));
    const jsonString = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
    await fs.writeFile(filePath, jsonString, 'utf8');
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Rate limiter
   */
  createRateLimiter(maxRequests = 100, windowMs = 60000) {
    const requests = new Map();
    
    return (identifier) => {
      const now = Date.now();
      const windowStart = now - windowMs;
      
      if (!requests.has(identifier)) {
        requests.set(identifier, []);
      }
      
      const userRequests = requests.get(identifier);
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => time > windowStart);
      
      if (validRequests.length >= maxRequests) {
        return {
          allowed: false,
          resetTime: Math.min(...validRequests) + windowMs,
          remaining: 0
        };
      }
      
      validRequests.push(now);
      requests.set(identifier, validRequests);
      
      return {
        allowed: true,
        remaining: maxRequests - validRequests.length,
        resetTime: now + windowMs
      };
    };
  }

  /**
   * Cache with TTL
   */
  createTTLCache(defaultTTL = 300000) { // 5 minutes default
    const cache = new Map();
    
    return {
      set(key, value, ttl = defaultTTL) {
        const expiry = Date.now() + ttl;
        cache.set(key, { value, expiry });
      },
      
      get(key) {
        const item = cache.get(key);
        if (!item) return undefined;
        
        if (Date.now() > item.expiry) {
          cache.delete(key);
          return undefined;
        }
        
        return item.value;
      },
      
      has(key) {
        const item = cache.get(key);
        if (!item) return false;
        
        if (Date.now() > item.expiry) {
          cache.delete(key);
          return false;
        }
        
        return true;
      },
      
      delete(key) {
        return cache.delete(key);
      },
      
      clear() {
        cache.clear();
      },
      
      size() {
        // Clean expired items first
        const now = Date.now();
        for (const [key, item] of cache.entries()) {
          if (now > item.expiry) {
            cache.delete(key);
          }
        }
        return cache.size;
      }
    };
  }

  /**
   * Environment variable helpers
   */
  env(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  envBool(key, defaultValue = false) {
    const value = process.env[key];
    if (!value) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  envInt(key, defaultValue = 0) {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  envFloat(key, defaultValue = 0.0) {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
}

module.exports = new Helpers();