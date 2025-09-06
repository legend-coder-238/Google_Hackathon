import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { authenticate, clerkAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('name').trim().isLength({ min: 2 }),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, name, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({ email, name, password });

    // Generate token
    const token = User.generateToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      },
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').exists(),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = User.generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
        token,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/auth/clerk
 * @desc Authenticate with Clerk
 * @access Public (but requires Clerk headers)
 */
router.post('/clerk', clerkAuth, async (req, res) => {
  try {
    // Generate our internal token for the user
    const token = User.generateToken(req.user);

    res.json({
      success: true,
      message: 'Clerk authentication successful',
      data: {
        user: req.user,
        token,
      },
    });

  } catch (error) {
    console.error('Clerk auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate with Clerk',
      error: error.message,
    });
  }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          clerkId: user.clerkId,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message,
    });
  }
});

/**
 * @route PUT /api/auth/me
 * @desc Update current user profile
 * @access Private
 */
router.put('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('email').optional().isEmail().normalizeEmail(),
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Email already taken by another user',
        });
      }
      updateData.email = email;
    }

    const updatedUser = await User.update(req.user.id, updateData);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          clerkId: updatedUser.clerkId,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
      },
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side token removal)
 * @access Private
 */
router.post('/logout', authenticate, (req, res) => {
  // JWT tokens are stateless, so logout is handled client-side
  // This endpoint exists for consistency and potential future features
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

export default router;