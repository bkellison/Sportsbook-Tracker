export class FormattersService {
  static formatCurrency(amount, options = {}) {
    const {
      currency = 'USD',
      locale = 'en-US',
      minimumFractionDigits = 2,
      maximumFractionDigits = 2
    } = options;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);
  }

  static formatNumber(value, options = {}) {
    const {
      locale = 'en-US',
      minimumFractionDigits = 0,
      maximumFractionDigits = 2
    } = options;

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value);
  }

  static formatPercentage(value, options = {}) {
    const {
      locale = 'en-US',
      minimumFractionDigits = 1,
      maximumFractionDigits = 1
    } = options;

    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits,
      maximumFractionDigits
    }).format(value / 100);
  }

  static formatDate(date, options = {}) {
    const {
      locale = 'en-US',
      dateStyle = 'medium'
    } = options;

    if (!date) return 'N/A';
    
    return new Intl.DateTimeFormat(locale, { dateStyle }).format(new Date(date));
  }

  static formatDateTime(date, options = {}) {
    const {
      locale = 'en-US',
      dateStyle = 'medium',
      timeStyle = 'short'
    } = options;

    if (!date) return 'N/A';
    
    return new Intl.DateTimeFormat(locale, { 
      dateStyle, 
      timeStyle 
    }).format(new Date(date));
  }

  static formatRelativeTime(date) {
    if (!date) return 'Never';
    
    const now = new Date();
    const targetDate = new Date(date);
    const diffInMs = now - targetDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  }

  static truncateText(text, maxLength = 50, suffix = '...') {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
  }

  static formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  static formatOrdinal(number) {
    const suffix = ['th', 'st', 'nd', 'rd'];
    const value = number % 100;
    return number + (suffix[(value - 20) % 10] || suffix[value] || suffix[0]);
  }

  static formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    
    return phoneNumber;
  }

  static capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  static formatCamelCase(string) {
    if (!string) return '';
    return string
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  static formatKebabCase(string) {
    if (!string) return '';
    return string
      .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  static formatSnakeCase(string) {
    if (!string) return '';
    return string
      .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1_$2')
      .toLowerCase();
  }
}