import { User } from '../models/User.js';

/**
 * Authentication middleware to verify JWT tokens
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.query?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    // Verify token
    const decoded = User.verifyToken(token);
    
    // Get user details
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.',
      });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      clerkId: user.clerkId,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token.',
      error: error.message,
    });
  }
};

/**
 * Optional authentication middleware - continues even if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                  req.cookies?.token ||
                  req.query?.token;

    if (token) {
      const decoded = User.verifyToken(token);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name,
          clerkId: user.clerkId,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

/**
 * Clerk authentication middleware for integration with Clerk
 */
export const clerkAuth = async (req, res, next) => {
  try {
    const clerkUserId = req.header('X-Clerk-User-Id');
    
    if (!clerkUserId) {
      return res.status(401).json({
        success: false,
        message: 'Clerk user ID required.',
      });
    }

    // Find or create user based on Clerk ID
    let user = await User.findByClerkId(clerkUserId);
    
    if (!user) {
      // Create user if doesn't exist (first time login with Clerk)
      const email = req.header('X-Clerk-User-Email');
      const name = req.header('X-Clerk-User-Name') || email?.split('@')[0];
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email required for user creation.',
        });
      }

      user = await User.create({
        email,
        name,
        password: 'clerk_managed', // Placeholder since Clerk manages auth
        clerkId: clerkUserId,
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      clerkId: user.clerkId,
    };

    next();
  } catch (error) {
    console.error('Clerk authentication error:', error);
    return res.status(401).json({
      success: false,
      message: 'Clerk authentication failed.',
      error: error.message,
    });
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // For now, all authenticated users have access
    // This can be extended to include role checking
    next();
  };
};

/**
 * Resource ownership middleware - ensures user owns the resource
 */
export const requireOwnership = (resourceIdParam = 'id', resourceModel = null) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.',
        });
      }

      const resourceId = req.params[resourceIdParam];
      
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required.',
        });
      }

      // Check ownership based on resource type
      if (resourceModel) {
        const resource = await resourceModel.findById(resourceId);
        
        if (!resource) {
          return res.status(404).json({
            success: false,
            message: 'Resource not found.',
          });
        }

        if (resource.userId !== req.user.id) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not own this resource.',
          });
        }

        req.resource = resource;
      }

      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify resource ownership.',
        error: error.message,
      });
    }
  };
};