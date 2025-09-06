import twilio from 'twilio';
import NodeCache from 'node-cache';
import winston from 'winston';

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

class SMSService {
  constructor() {
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Cache for storing OTP codes (expires in 10 minutes)
    this.otpCache = new NodeCache({ stdTTL: 600 }); // 10 minutes
    
    // Rate limiting cache (expires in 1 minute)
    this.rateLimitCache = new NodeCache({ stdTTL: 60 }); // 1 minute
  }

  /**
   * Generate a 6-digit OTP code
   */
  generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Check rate limiting for phone number
   */
  checkRateLimit(phone) {
    const key = `rate_limit_${phone}`;
    const attempts = this.rateLimitCache.get(key) || 0;
    
    if (attempts >= 3) {
      throw new Error('Too many SMS attempts. Please try again in 1 minute.');
    }
    
    this.rateLimitCache.set(key, attempts + 1);
    return true;
  }

  /**
   * Send OTP via SMS
   */
  async sendOTP(phone, purpose = 'verification') {
    try {
      // Check rate limiting
      this.checkRateLimit(phone);
      
      // Generate OTP
      const otp = this.generateOTP();
      
      // Store OTP in cache
      const cacheKey = `otp_${phone}`;
      this.otpCache.set(cacheKey, otp);
      
      // Prepare message based on purpose
      let message;
      switch (purpose) {
        case 'login':
          message = `Your Legal AI Advisor login code is: ${otp}. This code expires in 10 minutes.`;
          break;
        case 'registration':
          message = `Your Legal AI Advisor registration code is: ${otp}. This code expires in 10 minutes.`;
          break;
        default:
          message = `Your Legal AI Advisor verification code is: ${otp}. This code expires in 10 minutes.`;
      }
      
      // Send SMS via Twilio
      if (process.env.NODE_ENV === 'development' && !process.env.TWILIO_ACCOUNT_SID) {
        // In development without Twilio credentials, log the OTP
        logger.info(`SMS OTP for ${phone}: ${otp}`);
        return {
          success: true,
          message: 'OTP sent successfully (development mode)',
          otp: process.env.NODE_ENV === 'development' ? otp : undefined
        };
      }
      
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
      
      logger.info(`SMS sent successfully to ${phone}`, { sid: result.sid });
      
      return {
        success: true,
        message: 'OTP sent successfully',
        sid: result.sid
      };
      
    } catch (error) {
      logger.error('SMS sending failed:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Verify OTP code
   */
  verifyOTP(phone, providedOTP) {
    const cacheKey = `otp_${phone}`;
    const storedOTP = this.otpCache.get(cacheKey);
    
    if (!storedOTP) {
      throw new Error('OTP has expired or is invalid');
    }
    
    if (storedOTP !== providedOTP) {
      throw new Error('Invalid OTP code');
    }
    
    // Remove OTP from cache after successful verification
    this.otpCache.del(cacheKey);
    
    return true;
  }

  /**
   * Clear OTP for a phone number
   */
  clearOTP(phone) {
    const cacheKey = `otp_${phone}`;
    this.otpCache.del(cacheKey);
  }

  /**
   * Format phone number to E.164 format
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (assuming US +1)
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('+')) {
      return phone;
    }
    
    return `+${cleaned}`;
  }

  /**
   * Validate phone number format
   */
  isValidPhoneNumber(phone) {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(this.formatPhoneNumber(phone));
  }
}

export const smsService = new SMSService();
export default smsService;