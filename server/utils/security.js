const bcrypt = require('bcryptjs');

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Validate input to prevent injection attacks
 * @param {string} input - User input
 * @returns {boolean} True if input is safe
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return false;
  // Check for common injection patterns
  const dangerousPatterns = /<script|javascript:|onerror=|onclick=/i;
  return !dangerousPatterns.test(input);
};

/**
 * Rate limiting helper - track requests by IP
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  check(ip) {
    const now = Date.now();
    const userRequests = this.requests.get(ip) || [];
    
    // Remove old requests outside the time window
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(ip, recentRequests);
    return true;
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [ip, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(time => now - time < this.windowMs);
      if (recentRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, recentRequests);
      }
    }
  }
}

// Create a rate limiter instance
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

// Clean up every hour
setInterval(() => loginLimiter.cleanup(), 60 * 60 * 1000);

module.exports = {
  hashPassword,
  comparePassword,
  sanitizeInput,
  loginLimiter,
};
