import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import winston from 'winston';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = winston.createLogger({
  transports: [new winston.transports.Console()]
});

export class PythonBridge {
  constructor() {
    this.pythonPath = path.join(__dirname, '../../Google_Hackathon-AI/Google_Hackathon-AI/AI Code');
    this.isInitialized = false;
    this.init();
  }

  async init() {
    try {
      // Check if Python AI code exists
      if (!fs.existsSync(this.pythonPath)) {
        throw new Error(`Python AI code not found at: ${this.pythonPath}`);
      }

      // Check if required Python files exist
      const requiredFiles = ['chatbot.py', 'ingest.py', 'summarize.py', 'doc_classification.py'];
      for (const file of requiredFiles) {
        const filePath = path.join(this.pythonPath, file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`Required Python file not found: ${file}`);
        }
      }

      this.isInitialized = true;
      logger.info('Python bridge initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Python bridge:', error);
      throw error;
    }
  }

  async runPythonScript(scriptName, args = []) {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python', [scriptName, ...args], {
        cwd: this.pythonPath,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            // Try to parse JSON response
            const result = JSON.parse(stdout);
            resolve(result);
          } catch (parseError) {
            // If not JSON, return plain text
            resolve({ success: true, output: stdout.trim() });
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${stderr}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });
    });
  }

  async processDocument(filePath, documentId) {
    try {
      if (!this.isInitialized) {
        throw new Error('Python bridge not initialized');
      }

      logger.info(`Processing document: ${filePath}`);

      // First, classify the document
      const classificationResult = await this.classifyDocument(filePath);
      
      // Then, create summary
      const summaryResult = await this.summarizeDocument(filePath, classificationResult.classification);
      
      // Process for RAG (ingest into vector store)
      const ingestResult = await this.ingestDocument(filePath, documentId);

      return {
        success: true,
        classification: classificationResult.classification,
        summary: summaryResult.summary,
        ingested: ingestResult.success
      };

    } catch (error) {
      logger.error('Document processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async classifyDocument(filePath) {
    try {
      // Create a simple Python wrapper script for classification
      const wrapperScript = path.join(this.pythonPath, 'classify_wrapper.py');
      
      if (!fs.existsSync(wrapperScript)) {
        // Create the wrapper script if it doesn't exist
        const wrapperContent = `
import sys
import json
import os
from doc_classification import DocumentClassifier

def main():
    if len(sys.argv) != 2:
        print(json.dumps({"success": False, "error": "File path required"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        classifier = DocumentClassifier()
        classification = classifier.classify_document(file_path)
        
        result = {
            "success": True,
            "classification": classification
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
        fs.writeFileSync(wrapperScript, wrapperContent);
      }

      const result = await this.runPythonScript('classify_wrapper.py', [filePath]);
      return result;

    } catch (error) {
      logger.error('Document classification failed:', error);
      return {
        success: false,
        classification: 'OTHERS',
        error: error.message
      };
    }
  }

  async summarizeDocument(filePath, classification = 'OTHERS') {
    try {
      // Create a simple Python wrapper script for summarization
      const wrapperScript = path.join(this.pythonPath, 'summarize_wrapper.py');
      
      if (!fs.existsSync(wrapperScript)) {
        const wrapperContent = `
import sys
import json
import os
from summarize import DocumentSummarizer

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "File path and classification required"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    classification = sys.argv[2]
    
    try:
        summarizer = DocumentSummarizer()
        summary = summarizer.summarize(file_path, classification)
        
        result = {
            "success": True,
            "summary": summary
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
        fs.writeFileSync(wrapperScript, wrapperContent);
      }

      const result = await this.runPythonScript('summarize_wrapper.py', [filePath, classification]);
      return result;

    } catch (error) {
      logger.error('Document summarization failed:', error);
      return {
        success: false,
        summary: 'Summary generation failed',
        error: error.message
      };
    }
  }

  async ingestDocument(filePath, documentId) {
    try {
      // Create a simple Python wrapper script for ingestion
      const wrapperScript = path.join(this.pythonPath, 'ingest_wrapper.py');
      
      if (!fs.existsSync(wrapperScript)) {
        const wrapperContent = `
import sys
import json
import os
from ingest import DocumentIngestor

def main():
    if len(sys.argv) != 3:
        print(json.dumps({"success": False, "error": "File path and document ID required"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    document_id = sys.argv[2]
    
    try:
        ingestor = DocumentIngestor()
        result = ingestor.ingest_document(file_path, document_id)
        
        response = {
            "success": True,
            "document_id": document_id,
            "chunks_created": result.get('chunks_created', 0)
        }
        print(json.dumps(response))
        
    except Exception as e:
        response = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(response))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
        fs.writeFileSync(wrapperScript, wrapperContent);
      }

      const result = await this.runPythonScript('ingest_wrapper.py', [filePath, documentId]);
      return result;

    } catch (error) {
      logger.error('Document ingestion failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processChat(message, documentId, mode = 'qna') {
    try {
      if (!this.isInitialized) {
        throw new Error('Python bridge not initialized');
      }

      logger.info(`Processing chat - Document: ${documentId}, Mode: ${mode}`);

      // Create a simple Python wrapper script for chat
      const wrapperScript = path.join(this.pythonPath, 'chat_wrapper.py');
      
      if (!fs.existsSync(wrapperScript)) {
        const wrapperContent = `
import sys
import json
import os
from chatbot import LegalDocumentChatbot

def main():
    if len(sys.argv) != 4:
        print(json.dumps({"success": False, "error": "Message, document ID, and mode required"}))
        sys.exit(1)
    
    message = sys.argv[1]
    document_id = sys.argv[2]
    mode = sys.argv[3]
    
    try:
        # Initialize chatbot
        gemini_api_key = os.getenv('GEMINI_API_KEY')
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
            
        chatbot = LegalDocumentChatbot(gemini_api_key=gemini_api_key)
        
        # Process the message
        if mode == 'qna':
            response = chatbot.answer_question(message)
        elif mode == 'summarize':
            response = chatbot.summarize_document()
        elif mode == 'explain':
            response = chatbot.explain_clause(message)
        else:
            response = chatbot.answer_question(message)
        
        result = {
            "success": True,
            "response": response,
            "sources": [],
            "mode": mode
        }
        print(json.dumps(result))
        
    except Exception as e:
        result = {
            "success": False,
            "error": str(e),
            "response": "I apologize, but I'm having trouble processing your request right now. Please try again later."
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
        fs.writeFileSync(wrapperScript, wrapperContent);
      }

      const result = await this.runPythonScript('chat_wrapper.py', [message, documentId || '', mode]);
      
      if (result.success) {
        return {
          response: result.response,
          sources: result.sources || [],
          mode: mode
        };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      logger.error('Chat processing failed:', error);
      return {
        response: "I apologize, but I'm having trouble processing your request right now. Please try again later.",
        sources: [],
        mode: mode,
        error: error.message
      };
    }
  }
}