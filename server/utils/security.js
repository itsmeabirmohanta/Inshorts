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
 * Rate limiting helper - Redis-backed for horizontal scalability
 * Falls back to in-memory if Redis is unavailable
 */
class RateLimiter {
  constructor(maxRequests = 100, windowMs = 15 * 60 * 1000, redisClient = null) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.redisClient = redisClient;
    this.fallbackMap = new Map(); // In-memory fallback
  }

  async check(ip) {
    // Use Redis if available
    if (this.redisClient && this.redisClient.isReady) {
      try {
        const key = `rate_limit:${ip}`;
        const windowSeconds = Math.ceil(this.windowMs / 1000);
        
        // Atomic INCR with expiry using Lua script
        const luaScript = `
          local key = KEYS[1]
          local max = tonumber(ARGV[1])
          local ttl = tonumber(ARGV[2])
          local current = redis.call('INCR', key)
          if current == 1 then
            redis.call('EXPIRE', key, ttl)
          end
          return current
        `;
        
        const count = await this.redisClient.eval(luaScript, {
          keys: [key],
          arguments: [String(this.maxRequests), String(windowSeconds)]
        });
        
        return count <= this.maxRequests;
      } catch (err) {
        console.error('Redis rate limiter error, falling back to in-memory:', err.message);
        // Fall through to in-memory implementation
      }
    }
    
    // In-memory fallback
    const now = Date.now();
    const userRequests = this.fallbackMap.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.fallbackMap.set(ip, recentRequests);
    return true;
  }

  // Cleanup for in-memory fallback only
  cleanup() {
    if (this.redisClient && this.redisClient.isReady) return; // No cleanup needed for Redis
    
    const now = Date.now();
    for (const [ip, requests] of this.fallbackMap.entries()) {
      const recentRequests = requests.filter(time => now - time < this.windowMs);
      if (recentRequests.length === 0) {
        this.fallbackMap.delete(ip);
      } else {
        this.fallbackMap.set(ip, recentRequests);
      }
    }
  }
}

// Initialize Redis client (optional - will use in-memory if not configured)
let redisClient = null;
try {
  const redis = require('redis');
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  redisClient = redis.createClient({ url: redisUrl });
  redisClient.on('error', (err) => {
    console.warn('Redis connection error (rate limiting will use in-memory fallback):', err.message);
  });
  redisClient.connect().catch(() => {
    console.warn('Redis not available, rate limiting will use in-memory storage');
  });
} catch (err) {
  console.warn('Redis module not found, rate limiting will use in-memory storage');
}

// Create a rate limiter instance with Redis support
const loginLimiter = new RateLimiter(5, 15 * 60 * 1000, redisClient); // 5 attempts per 15 minutes

// Clean up in-memory fallback every hour
const cleanupInterval = setInterval(() => loginLimiter.cleanup(), 60 * 60 * 1000);

const stopCleanup = () => {
  clearInterval(cleanupInterval);
  if (redisClient) {
    redisClient.quit().catch(() => {});
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  sanitizeInput,
  loginLimiter,
  stopCleanup,
  RateLimiter, // Export class for testing/custom instances
};
