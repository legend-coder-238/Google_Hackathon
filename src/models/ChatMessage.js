import { prisma } from '../services/database.js';

export class ChatMessage {
  /**
   * Create a new chat message
   */
  static async create({
    message,
    response,
    mode = 'qna',
    sources = null,
    userId,
    documentId = null,
    sessionId,
  }) {
    return await prisma.chatMessage.create({
      data: {
        message,
        response,
        mode,
        sources: sources ? JSON.stringify(sources) : null,
        userId,
        documentId,
        sessionId,
      },
    });
  }

  /**
   * Find message by ID
   */
  static async findById(id) {
    const message = await prisma.chatMessage.findUnique({
      where: { id },
      include: {
        user: true,
        document: true,
        session: true,
      },
    });

    if (message && message.sources) {
      try {
        message.sources = JSON.parse(message.sources);
      } catch (error) {
        message.sources = [];
      }
    }

    return message;
  }

  /**
   * Find messages by session ID
   */
  static async findBySessionId(sessionId) {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      include: {
        user: true,
        document: true,
      },
      orderBy: { timestamp: 'asc' },
    });

    return messages.map(message => ({
      ...message,
      sources: message.sources ? JSON.parse(message.sources) : [],
    }));
  }

  /**
   * Find messages by user ID
   */
  static async findByUserId(userId, limit = 50) {
    const messages = await prisma.chatMessage.findMany({
      where: { userId },
      include: {
        document: true,
        session: true,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return messages.map(message => ({
      ...message,
      sources: message.sources ? JSON.parse(message.sources) : [],
    }));
  }

  /**
   * Find messages by document ID
   */
  static async findByDocumentId(documentId) {
    const messages = await prisma.chatMessage.findMany({
      where: { documentId },
      include: {
        user: true,
        session: true,
      },
      orderBy: { timestamp: 'desc' },
    });

    return messages.map(message => ({
      ...message,
      sources: message.sources ? JSON.parse(message.sources) : [],
    }));
  }

  /**
   * Update message
   */
  static async update(id, data) {
    if (data.sources) {
      data.sources = JSON.stringify(data.sources);
    }

    return await prisma.chatMessage.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete message
   */
  static async delete(id) {
    return await prisma.chatMessage.delete({
      where: { id },
    });
  }

  /**
   * Delete messages by session ID
   */
  static async deleteBySessionId(sessionId) {
    return await prisma.chatMessage.deleteMany({
      where: { sessionId },
    });
  }

  /**
   * Get message statistics for a user
   */
  static async getStatsByUserId(userId) {
    const messageCount = await prisma.chatMessage.count({
      where: { userId },
    });

    const modeStats = await prisma.chatMessage.groupBy({
      by: ['mode'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    return {
      totalMessages: messageCount,
      byMode: modeStats,
    };
  }
}