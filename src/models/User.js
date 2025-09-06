import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/database.js';

export class User {
  /**
   * Create a new user
   */
  static async create({ email, name, password, clerkId = null, phone = null }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    
    return await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        clerkId,
        phone,
        phoneVerified: false,
      },
    });
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        documents: true,
        chatSessions: {
          include: {
            messages: true,
          },
        },
      },
    });
  }

  /**
   * Find user by Clerk ID
   */
  static async findByClerkId(clerkId) {
    return await prisma.user.findUnique({
      where: { clerkId },
    });
  }

  /**
   * Find user by phone number
   */
  static async findByPhone(phone) {
    return await prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Update phone verification status
   */
  static async markPhoneVerified(id) {
    return await prisma.user.update({
      where: { id },
      data: { phoneVerified: true },
    });
  }

  /**
   * Verify password
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Generate JWT token
   */
  static generateToken(user) {
    return jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        name: user.name 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  /**
   * Update user
   */
  static async update(id, data) {
    return await prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete user
   */
  static async delete(id) {
    return await prisma.user.delete({
      where: { id },
    });
  }
}