import { prisma } from '../services/database.js';

export class Document {
  /**
   * Create a new document
   */
  static async create({
    originalName,
    filename,
    size,
    mimeType,
    path,
    userId,
    classification = null,
    summary = null,
  }) {
    return await prisma.document.create({
      data: {
        originalName,
        filename,
        size,
        mimeType,
        path,
        userId,
        classification,
        summary,
      },
    });
  }

  /**
   * Find document by ID
   */
  static async findById(id) {
    return await prisma.document.findUnique({
      where: { id },
      include: {
        user: true,
        chatSessions: {
          include: {
            messages: true,
          },
        },
      },
    });
  }

  /**
   * Find documents by user ID
   */
  static async findByUserId(userId) {
    return await prisma.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Update document
   */
  static async update(id, data) {
    return await prisma.document.update({
      where: { id },
      data,
    });
  }

  /**
   * Mark document as processed
   */
  static async markAsProcessed(id, classification = null, summary = null) {
    return await prisma.document.update({
      where: { id },
      data: {
        processed: true,
        classification,
        summary,
      },
    });
  }

  /**
   * Delete document
   */
  static async delete(id) {
    return await prisma.document.delete({
      where: { id },
    });
  }

  /**
   * Get document statistics for a user
   */
  static async getStatsByUserId(userId) {
    const stats = await prisma.document.groupBy({
      by: ['classification'],
      where: { userId },
      _count: {
        id: true,
      },
    });

    const totalDocuments = await prisma.document.count({
      where: { userId },
    });

    return {
      totalDocuments,
      byClassification: stats,
    };
  }
}