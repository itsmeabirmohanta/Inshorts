const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header and attaches user info to req.user
 * 
 * @usage Apply to protected routes: router.post('/path', authenticate, handler)
 */
const authenticate = (req, res, next) => {
  try {
    // Extract token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required. Please provide a valid token.', 
        code: 'NO_TOKEN' 
      });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, jwtSecret);
    
    // Attach user info to request object for use in route handlers
    req.user = {
      id: decoded.sub, // User ID from token payload
      role: decoded.role // User role (student/teacher)
    };
    
    next(); // Continue to route handler
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Token has expired. Please login again.', 
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token. Please login again.', 
        code: 'INVALID_TOKEN' 
      });
    }
    
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed', 
      code: 'AUTH_ERROR' 
    });
  }
};

/**
 * Role-based Authorization Middleware
 * Ensures user has the required role
 * 
 * @param {string|string[]} allowedRoles - Single role or array of allowed roles
 * @usage router.post('/path', authenticate, authorize('teacher'), handler)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required', 
        code: 'NO_AUTH' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to perform this action', 
        code: 'FORBIDDEN' 
      });
    }

    next();
  };
};

module.exports = { authenticate, authorize };
