import express from 'express';
import winston from 'winston';
import { PythonBridge } from '../services/pythonBridge.js';
import { authenticate } from '../middleware/auth.js';
import { ChatSession } from '../models/ChatSession.js';
import { ChatMessage } from '../models/ChatMessage.js';
import { Document } from '../models/Document.js';

const router = express.Router();
const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

// Initialize Python bridge
const pythonBridge = new PythonBridge();

// Chat endpoint for Q&A with documents
router.post('/message', authenticate, async (req, res) => {
  try {
    const { message, documentId, mode = 'qna', sessionId } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    logger.info(`Chat request - Document: ${documentId}, Mode: ${mode}, Message: ${message.substring(0, 100)}...`);

    // Verify document ownership if documentId is provided
    if (documentId) {
      const document = await Document.findById(documentId);
      if (!document || document.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Document not found or you do not own this document.'
        });
      }
    }

    // Get or create chat session
    let session;
    if (sessionId) {
      session = await ChatSession.findById(sessionId);
      if (!session || session.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Chat session not found or you do not own this session.'
        });
      }
    } else {
      // Create new session
      session = await ChatSession.create({
        userId: req.user.id,
        documentId: documentId || null,
        title: `Chat - ${new Date().toLocaleDateString()}`
      });
    }

    logger.info(`Processing chat - Document: ${documentId}, Mode: ${mode}`);

    // Process chat message with Python AI
    const chatResponse = await pythonBridge.processChat(message, documentId, mode);

    // Save chat message to database
    const savedMessage = await ChatMessage.create({
      message,
      response: chatResponse.response,
      mode,
      sources: chatResponse.sources || [],
      userId: req.user.id,
      documentId: documentId || null,
      sessionId: session.id
    });

    res.json({
      success: true,
      data: {
        messageId: savedMessage.id,
        sessionId: session.id,
        response: chatResponse.response,
        sources: chatResponse.sources || [],
        mode: mode,
        timestamp: savedMessage.timestamp
      }
    });

  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process chat message',
      error: error.message
    });
  }
});

// Get chat history for a document or session
router.get('/history/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Verify document ownership
    const document = await Document.findById(documentId);
    if (!document || document.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Document not found or you do not own this document.'
      });
    }

    // Get chat messages for this document
    const messages = await ChatMessage.findByDocumentId(documentId);
    
    res.json({
      success: true,
      data: {
        documentId: documentId,
        history: messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          response: msg.response,
          mode: msg.mode,
          sources: msg.sources,
          timestamp: msg.timestamp
        }))
      }
    });

  } catch (error) {
    logger.error('Chat history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
      error: error.message
    });
  }
});

// Clear chat history for a document
router.delete('/history/:documentId', authenticate, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Verify document ownership
    const document = await Document.findById(documentId);
    if (!document || document.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Document not found or you do not own this document.'
      });
    }

    // Get all sessions for this document and clear their messages
    const sessions = await ChatSession.findByDocumentId(documentId);
    
    for (const session of sessions) {
      if (session.userId === req.user.id) {
        await ChatSession.clearMessages(session.id);
      }
    }
    
    logger.info(`Cleared chat history for document: ${documentId} by user: ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Chat history cleared'
    });

  } catch (error) {
    logger.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
      error: error.message
    });
  }
});

// Get all chat sessions for a user
router.get('/sessions', authenticate, async (req, res) => {
  try {
    const sessions = await ChatSession.findByUserId(req.user.id);
    
    res.json({
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        title: session.title,
        documentId: session.documentId,
        documentName: session.document?.originalName,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastMessage: session.messages[0]?.message || null
      }))
    });

  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat sessions',
      error: error.message
    });
  }
});

// Get messages for a specific session
router.get('/sessions/:sessionId/messages', authenticate, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Verify session ownership
    const session = await ChatSession.findById(sessionId);
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Session not found or you do not own this session.'
      });
    }

    const messages = await ChatMessage.findBySessionId(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId: sessionId,
        messages: messages.map(msg => ({
          id: msg.id,
          message: msg.message,
          response: msg.response,
          mode: msg.mode,
          sources: msg.sources,
          timestamp: msg.timestamp
        }))
      }
    });

  } catch (error) {
    logger.error('Get session messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get session messages',
      error: error.message
    });
  }
});

export default router;