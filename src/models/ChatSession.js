import { prisma } from '../services/database.js';

export class ChatSession {
  /**
   * Create a new chat session
   */
  static async create({ userId, documentId = null, title = null }) {
    return await prisma.chatSession.create({
      data: {
        userId,
        documentId,
        title,
      },
    });
  }

  /**
   * Find session by ID
   */
  static async findById(id) {
    return await prisma.chatSession.findUnique({
      where: { id },
      include: {
        user: true,
        document: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });
  }

  /**
   * Find sessions by user ID
   */
  static async findByUserId(userId) {
    return await prisma.chatSession.findMany({
      where: { userId },
      include: {
        document: true,
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1, // Get last message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Find sessions by document ID
   */
  static async findByDocumentId(documentId) {
    return await prisma.chatSession.findMany({
      where: { documentId },
      include: {
        user: true,
        messages: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update session
   */
  static async update(id, data) {
    return await prisma.chatSession.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete session
   */
  static async delete(id) {
    return await prisma.chatSession.delete({
      where: { id },
    });
  }

  /**
   * Clear all messages in a session
   */
  static async clearMessages(id) {
    await prisma.chatMessage.deleteMany({
      where: { sessionId: id },
    });

    return await this.update(id, { updatedAt: new Date() });
  }
}