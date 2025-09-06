import express from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { smsService } from '../services/smsService.js';
import winston from 'winston';

const router = express.Router();
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

/**
 * @route POST /api/phone/send-otp
 * @desc Send OTP to phone number
 * @access Public
 */
router.post('/send-otp', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('purpose').optional().isIn(['login', 'registration', 'verification']).withMessage('Invalid purpose'),
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

    const { phone, purpose = 'verification' } = req.body;
    
    // Format and validate phone number
    const formattedPhone = smsService.formatPhoneNumber(phone);
    if (!smsService.isValidPhoneNumber(formattedPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format',
      });
    }

    // Check if phone number exists for registration
    if (purpose === 'registration') {
      const existingUser = await User.findByPhone(formattedPhone);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered',
        });
      }
    }

    // Send OTP
    const result = await smsService.sendOTP(formattedPhone, purpose);
    
    logger.info(`OTP sent to ${formattedPhone} for ${purpose}`);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        phone: formattedPhone,
        purpose,
        // Include OTP in development mode only
        ...(process.env.NODE_ENV === 'development' && result.otp && { otp: result.otp })
      },
    });

  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP',
    });
  }
});

/**
 * @route POST /api/phone/verify-otp
 * @desc Verify OTP code
 * @access Public
 */
router.post('/verify-otp', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
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

    const { phone, otp } = req.body;
    
    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(phone);
    
    // Verify OTP
    const isValid = smsService.verifyOTP(formattedPhone, otp);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    logger.info(`OTP verified successfully for ${formattedPhone}`);
    
    res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        phone: formattedPhone,
        verified: true,
      },
    });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'OTP verification failed',
    });
  }
});

/**
 * @route POST /api/phone/register
 * @desc Register user with phone number after OTP verification
 * @access Public
 */
router.post('/register', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
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

    const { phone, name, email, password, otp } = req.body;
    
    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(phone);
    
    // Verify OTP first
    try {
      smsService.verifyOTP(formattedPhone, otp);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Check if email already exists
    const existingEmailUser = await User.findByEmail(email);
    if (existingEmailUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Check if phone already exists
    const existingPhoneUser = await User.findByPhone(formattedPhone);
    if (existingPhoneUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered',
      });
    }

    // Create user with verified phone
    const user = await User.create({
      email,
      name,
      password,
      phone: formattedPhone,
    });

    // Mark phone as verified
    await User.markPhoneVerified(user.id);

    // Generate token
    const token = User.generateToken(user);

    logger.info(`User registered successfully with phone: ${formattedPhone}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          phoneVerified: true,
          createdAt: user.createdAt,
        },
        token,
      },
    });

  } catch (error) {
    logger.error('Phone registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      error: error.message,
    });
  }
});

/**
 * @route POST /api/phone/login
 * @desc Login user with phone number and OTP
 * @access Public
 */
router.post('/login', [
  body('phone').isMobilePhone().withMessage('Please provide a valid phone number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
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

    const { phone, otp } = req.body;
    
    // Format phone number
    const formattedPhone = smsService.formatPhoneNumber(phone);
    
    // Verify OTP first
    try {
      smsService.verifyOTP(formattedPhone, otp);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Find user by phone
    const user = await User.findByPhone(formattedPhone);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number',
      });
    }

    // Generate token
    const token = User.generateToken(user);

    logger.info(`User logged in successfully with phone: ${formattedPhone}`);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          phoneVerified: user.phoneVerified,
          createdAt: user.createdAt,
        },
        token,
      },
    });

  } catch (error) {
    logger.error('Phone login error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message,
    });
  }
});

export default router;