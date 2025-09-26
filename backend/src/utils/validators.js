class Validators {
  /**
   * Validate email address
   */
  static email(value) {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value.trim());
  }

  /**
   * Validate username
   */
  static username(value, minLength = 3, maxLength = 30) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length < minLength || trimmed.length > maxLength) return false;
    
    // Only alphanumeric, underscore, and hyphen allowed
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    return usernameRegex.test(trimmed);
  }

  /**
   * Validate password strength
   */
  static password(value, options = {}) {
    const {
      minLength = 6,
      requireUppercase = false,
      requireLowercase = false,
      requireNumbers = false,
      requireSpecialChars = false,
      forbidCommonPasswords = true
    } = options;

    if (typeof value !== 'string') return { valid: false, errors: ['Password must be a string'] };
    
    const errors = [];
    
    if (value.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }
    
    if (requireUppercase && !/[A-Z]/.test(value)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (requireLowercase && !/[a-z]/.test(value)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (requireNumbers && !/\d/.test(value)) {
      errors.push('Password must contain at least one number');
    }
    
    if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      errors.push('Password must contain at least one special character');
    }
    
    if (forbidCommonPasswords) {
      const commonPasswords = [
        'password', '123456', 'password123', 'admin', 'qwerty', 
        'letmein', 'welcome', 'monkey', '1234567890', 'abc123',
        'password1', '12345678', 'sunshine', 'iloveyou', 'princess'
      ];
      
      if (commonPasswords.includes(value.toLowerCase())) {
        errors.push('Password is too common. Please choose a stronger password');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(value)
    };
  }

  /**
   * Calculate password strength score (0-100)
   */
  static calculatePasswordStrength(password) {
    let score = 0;
    
    // Length bonus
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 15;
    
    return Math.min(100, score);
  }

  /**
   * Validate phone number
   */
  static phone(value, format = 'international') {
    if (typeof value !== 'string') return false;
    
    const cleaned = value.replace(/\D/g, '');
    
    if (format === 'us') {
      return cleaned.length === 10 || (cleaned.length === 11 && cleaned[0] === '1');
    }
    
    // International format (7-15 digits)
    return cleaned.length >= 7 && cleaned.length <= 15;
  }

  /**
   * Validate URL
   */
  static url(value, options = {}) {
    const { requireProtocol = true, allowedProtocols = ['http', 'https'] } = options;
    
    if (typeof value !== 'string') return false;
    
    try {
      const url = new URL(value);
      
      if (requireProtocol && !allowedProtocols.includes(url.protocol.slice(0, -1))) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate date
   */
  static date(value, options = {}) {
    const { minDate, maxDate, format } = options;
    
    let date;
    
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string') {
      if (format) {
        // Basic format validation (YYYY-MM-DD)
        if (format === 'YYYY-MM-DD' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
          return false;
        }
      }
      date = new Date(value);
    } else {
      return false;
    }
    
    if (isNaN(date.getTime())) return false;
    
    if (minDate && date < new Date(minDate)) return false;
    if (maxDate && date > new Date(maxDate)) return false;
    
    return true;
  }

  /**
   * Validate number with constraints
   */
  static number(value, options = {}) {
    const { min, max, integer = false, positive = false } = options;
    
    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num)) return false;
    
    if (integer && !Number.isInteger(num)) return false;
    if (positive && num <= 0) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    
    return true;
  }

  /**
   * Validate currency amount
   */
  static currency(value, options = {}) {
    const { min = 0, max, allowNegative = false } = options;
    
    const num = parseFloat(value);
    if (isNaN(num) || !isFinite(num)) return false;
    
    // Check decimal places (max 2 for currency)
    if (num.toString().includes('.')) {
      const decimals = num.toString().split('.')[1];
      if (decimals.length > 2) return false;
    }
    
    if (!allowNegative && num < 0) return false;
    if (num < min) return false;
    if (max !== undefined && num > max) return false;
    
    return true;
  }

  /**
   * Validate array
   */
  static array(value, options = {}) {
    const { minLength = 0, maxLength, itemValidator } = options;
    
    if (!Array.isArray(value)) return false;
    if (value.length < minLength) return false;
    if (maxLength !== undefined && value.length > maxLength) return false;
    
    if (itemValidator) {
      return value.every(item => itemValidator(item));
    }
    
    return true;
  }

  /**
   * Validate string with constraints
   */
  static string(value, options = {}) {
    const { 
      minLength = 0, 
      maxLength, 
      pattern, 
      trim = true,
      allowEmpty = true 
    } = options;
    
    if (typeof value !== 'string') return false;
    
    const str = trim ? value.trim() : value;
    
    if (!allowEmpty && str.length === 0) return false;
    if (str.length < minLength) return false;
    if (maxLength !== undefined && str.length > maxLength) return false;
    
    if (pattern) {
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (!regex.test(str)) return false;
    }
    
    return true;
  }

  /**
   * Validate object structure
   */
  static object(value, schema = {}) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return { valid: false, errors: ['Value must be an object'] };
    }
    
    const errors = [];
    const requiredKeys = Object.keys(schema).filter(key => 
      schema[key].required !== false
    );
    
    // Check required keys
    for (const key of requiredKeys) {
      if (!(key in value)) {
        errors.push(`Missing required field: ${key}`);
      }
    }
    
    // Validate each field
    for (const [key, rules] of Object.entries(schema)) {
      if (key in value) {
        const fieldValue = value[key];
        const validator = rules.validator || rules;
        
        if (typeof validator === 'function') {
          const result = validator(fieldValue);
          if (result === false) {
            errors.push(`Invalid value for field: ${key}`);
          } else if (result && typeof result === 'object' && !result.valid) {
            errors.push(`${key}: ${result.errors?.join(', ') || 'Invalid value'}`);
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate JSON string
   */
  static json(value) {
    if (typeof value !== 'string') return false;
    
    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate UUID
   */
  static uuid(value, version = null) {
    if (typeof value !== 'string') return false;
    
    const uuidRegexes = {
      1: /^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      2: /^[0-9a-f]{8}-[0-9a-f]{4}-2[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      3: /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      4: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      5: /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      all: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    };
    
    const regex = uuidRegexes[version] || uuidRegexes.all;
    return regex.test(value);
  }

  /**
   * Validate credit card number (basic Luhn algorithm)
   */
  static creditCard(value) {
    if (typeof value !== 'string') return false;
    
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length < 13 || cleaned.length > 19) return false;
    
    // Luhn algorithm
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Validate IP address
   */
  static ip(value, version = 'both') {
    if (typeof value !== 'string') return false;
    
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
    
    switch (version) {
      case 'v4':
        return ipv4Regex.test(value);
      case 'v6':
        return ipv6Regex.test(value);
      case 'both':
      default:
        return ipv4Regex.test(value) || ipv6Regex.test(value);
    }
  }

  /**
   * Validate hex color
   */
  static hexColor(value) {
    if (typeof value !== 'string') return false;
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
  }

  /**
   * Validate transaction type
   */
  static transactionType(value) {
    const validTypes = [
      'deposit', 
      'withdrawal', 
      'bet', 
      'bonus-credit', 
      'historical-win', 
      'historical-loss'
    ];
    return validTypes.includes(value);
  }

  /**
   * Validate bet status
   */
  static betStatus(value) {
    const validStatuses = ['pending', 'won', 'lost'];
    return validStatuses.includes(value);
  }

  /**
   * Validate account key
   */
  static accountKey(value) {
    if (typeof value !== 'string') return false;
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 50) return false;
    
    // Only alphanumeric, underscore, and hyphen allowed
    const accountKeyRegex = /^[a-zA-Z0-9_-]+$/;
    return accountKeyRegex.test(trimmed);
  }

  /**
   * Validate pagination parameters
   */
  static pagination(page, limit, maxLimit = 100) {
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (isNaN(pageNum) || pageNum < 1) return false;
    if (isNaN(limitNum) || limitNum < 1 || limitNum > maxLimit) return false;
    
    return true;
  }

  /**
   * Validate date range
   */
  static dateRange(startDate, endDate, maxRangeDays = 365) {
    if (!this.date(startDate) || !this.date(endDate)) return false;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) return false;
    
    const diffMs = end - start;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    return diffDays <= maxRangeDays;
  }

  /**
   * Validate file extension
   */
  static fileExtension(filename, allowedExtensions) {
    if (typeof filename !== 'string') return false;
    if (!Array.isArray(allowedExtensions)) return true; // No restrictions
    
    const extension = filename.toLowerCase().split('.').pop();
    return allowedExtensions.map(ext => ext.toLowerCase()).includes(extension);
  }

  /**
   * Validate MIME type
   */
  static mimeType(mimeType, allowedTypes) {
    if (typeof mimeType !== 'string') return false;
    if (!Array.isArray(allowedTypes)) return true; // No restrictions
    
    return allowedTypes.includes(mimeType);
  }

  /**
   * Validate time format (HH:MM or HH:MM:SS)
   */
  static time(value, format = '24h') {
    if (typeof value !== 'string') return false;
    
    if (format === '24h') {
      return /^([01]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/.test(value);
    } else if (format === '12h') {
      return /^(0?[1-9]|1[0-2]):[0-5][0-9](:[0-5][0-9])?\s?(AM|PM)$/i.test(value);
    }
    
    return false;
  }

  /**
   * Validate timezone
   */
  static timezone(value) {
    if (typeof value !== 'string') return false;
    
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate locale
   */
  static locale(value) {
    if (typeof value !== 'string') return false;
    
    try {
      new Intl.Locale(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create custom validator
   */
  static custom(validatorFn, errorMessage = 'Validation failed') {
    return (value) => {
      try {
        const result = validatorFn(value);
        if (typeof result === 'boolean') {
          return result ? true : { valid: false, error: errorMessage };
        }
        return result;
      } catch (error) {
        return { valid: false, error: error.message || errorMessage };
      }
    };
  }

  /**
   * Chain multiple validators
   */
  static chain(...validators) {
    return (value) => {
      for (const validator of validators) {
        const result = validator(value);
        if (result === false || (result && result.valid === false)) {
          return result;
        }
      }
      return true;
    };
  }

  /**
   * Validate any of the given validators (OR logic)
   */
  static any(...validators) {
    return (value) => {
      const errors = [];
      
      for (const validator of validators) {
        const result = validator(value);
        if (result === true) return true;
        
        if (result === false) {
          errors.push('Validation failed');
        } else if (result && result.valid === false) {
          errors.push(result.error || 'Validation failed');
        }
      }
      
      return {
        valid: false,
        errors,
        error: `None of the validation rules passed: ${errors.join(', ')}`
      };
    };
  }
}

module.exports = Validators;