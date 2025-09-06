import express from 'express';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import winston from 'winston';
import { authenticate } from '../middleware/auth.js';
import { Document } from '../models/Document.js';
import { ChatSession } from '../models/ChatSession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Get all documents for authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const documents = await Document.findByUserId(req.user.id);
    
    // Return documents without file paths for security
    const sanitizedDocuments = documents.map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      size: doc.size,
      mimeType: doc.mimeType,
      uploadedAt: doc.uploadedAt,
      processed: doc.processed,
      classification: doc.classification,
      summary: doc.summary
    }));

    res.json({
      success: true,
      data: sanitizedDocuments
    });

  } catch (error) {
    logger.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get documents',
      error: error.message
    });
  }
});

// Get specific document details
router.get('/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user owns this document
    if (document.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this document.'
      });
    }

    // Return document without file path for security
    const sanitizedDocument = {
      id: document.id,
      originalName: document.originalName,
      size: document.size,
      mimeType: document.mimeType,
      uploadedAt: document.uploadedAt,
      processed: document.processed,
      summary: document.summary,
      classification: document.classification
    };

    res.json({
      success: true,
      data: sanitizedDocument
    });

  } catch (error) {
    logger.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document',
      error: error.message
    });
  }
});

// Delete document
router.delete('/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if user owns this document
    if (document.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this document.'
      });
    }

    // Delete the actual file
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    // Delete from database (cascade will handle related records)
    await Document.delete(documentId);

    logger.info(`Document deleted: ${documentId} by user: ${req.user.id}`);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error.message
    });
  }
});

export default router;