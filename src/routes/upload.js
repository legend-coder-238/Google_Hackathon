import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import winston from 'winston';
import { PythonBridge } from '../services/pythonBridge.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { Document } from '../models/Document.js';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads');
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept PDF, DOC, DOCX, and TXT files
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and TXT files are allowed'), false);
    }
  }
});

// Initialize Python bridge
const pythonBridge = new PythonBridge();

// Upload and process document
router.post('/', authenticate, upload.single('document'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Debug logging
    logger.info('Upload request received:', {
      hasFile: !!req.file,
      bodyKeys: Object.keys(req.body || {}),
      headers: req.headers['content-type'],
      method: req.method,
      userId: req.user.id,
      timestamp: new Date().toISOString()
    });
    
    if (!req.file) {
      logger.error('No file in request:', {
        body: req.body,
        files: req.files,
        headers: req.headers
      });
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const uploadDuration = Date.now() - startTime;
    logger.info(`File uploaded: ${req.file.filename} by user: ${req.user.id} in ${uploadDuration}ms`, {
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadDuration
    });

    // Create document record in database
    const document = await Document.create({
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      path: req.file.path,
      userId: req.user.id,
    });

    // Process document with Python AI in background
    try {
      logger.info(`Processing document: ${req.file.path}`);
      const processResult = await pythonBridge.processDocument(req.file.path, document.id);
      
      // Update document with processing results
      await Document.markAsProcessed(
        document.id,
        processResult.classification,
        processResult.summary
      );
      
      logger.info(`Document processed successfully: ${document.id}`);
      
      res.json({
        success: true,
        message: 'Document uploaded and processed successfully',
        data: {
          documentId: document.id,
          filename: req.file.originalname,
          size: req.file.size,
          processed: true,
          summary: processResult.summary,
          classification: processResult.classification
        }
      });
      
    } catch (processingError) {
      logger.error(`Document processing failed: ${processingError.message}`);
      
      // Still return success for upload, but mark as not processed
      res.json({
        success: true,
        message: 'Document uploaded successfully, processing failed',
        data: {
          documentId: document.id,
          filename: req.file.originalname,
          size: req.file.size,
          processed: false,
          error: processingError.message
        }
      });
    }

  } catch (error) {
    logger.error('Upload error:', error);
    
    // Clean up uploaded file if processing failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error.message
    });
  }
});

// Get upload status
router.get('/status/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Find document in database
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

    res.json({
      success: true,
      data: {
        id: document.id,
        originalName: document.originalName,
        size: document.size,
        mimeType: document.mimeType,
        uploadedAt: document.uploadedAt,
        processed: document.processed,
        classification: document.classification,
        summary: document.summary
      }
    });

  } catch (error) {
    logger.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get document status',
      error: error.message
    });
  }
});

export default router;