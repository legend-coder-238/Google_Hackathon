# Legal AI Advisor - Full Stack Application

A complete full-stack application that combines AI-powered legal document analysis with a modern web interface.

## 🏗️ Architecture

```
Legal-AI-Advisor/
├── src/                          # Backend API (Node.js + Express)
│   ├── server.js                 # Main server file
│   ├── routes/                   # API endpoints
│   │   ├── upload.js            # Document upload
│   │   ├── chat.js              # Chat functionality
│   │   ├── documents.js         # Document management
│   │   └── health.js            # Health checks
│   └── services/
│       └── pythonBridge.js      # Python-Node.js bridge
├── Google_Hackathon-AI/          # Python AI backend
│   └── Google_Hackathon-AI/
│       └── AI Code/              # AI processing modules
│           ├── chatbot.py        # Main chatbot
│           ├── ingest.py         # Document ingestion
│           ├── summarize.py      # Document summarization
│           └── doc_classification.py  # Document classification
└── Google_Hackathon-Frontend/    # React frontend
    └── Google_Hackathon-Frontend/
        └── src/
               ├── app/
               ├──components/
                  └──chat-interface.tsx                    # React application
                  └──chat-sidebar.tsx
                  └──clause-extra.tsx
                  └──document-upload.tsx
                  └──simple-pdf-viewer.tsx
                  └──theme-provider.tsx
                  └──theme-toggle.tsx
                  └──user-menu.tsx
                  
```            ├──lib/

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Google Gemini API key (get from https://makersuite.google.com/app/apikey)

### 1. Install Backend Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
cd "Google_Hackathon-AI/Google_Hackathon-AI/AI Code"
pip install -r requirements.txt
cd ../../..
```

### 2. Install Frontend Dependencies

```bash
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm install
cd ../..
```

### 3. Configure Environment

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Google Gemini API key ,:
```env
GEMINI_API_KEY=your_actual_api_key_here

```

### 4. Start the Application

Option A: Start all services at once
```bash
npm run start:all
```

Option B: Start services individually

Terminal 1 (Backend):
```bash
npm run dev
```

Terminal 2 (Frontend):
```bash
npm run start:frontend
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/api/health

## 📋 API Endpoints

### Document Management
- `POST /api/upload` - Upload and process documents
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get document details
- `DELETE /api/documents/:id` - Delete document

### Chat & AI
- `POST /api/chat/message` - Send chat message
- `GET /api/chat/history/:documentId` - Get chat history
- `DELETE /api/chat/history/:documentId` - Clear chat history

### System
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed system status

## 🧪 Testing the Integration

1. **Upload a Document**:
   - Go to http://localhost:3000
   - Sign in with Clerk authentication
   - Navigate to the chat page
   - Upload a legal document (PDF, DOC, DOCX, TXT)

2. **Test Chat Functionality**:
   - Ask questions about the uploaded document
   - Try different modes: QnA, Summarize, Explain Clauses

3. **Verify API Health**:
   ```bash
   curl http://localhost:3001/api/health
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `MAX_FILE_SIZE` | Max upload size in bytes | `52428800` (50MB) |

### File Support

Supported document types:
- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Plain text (.txt)

## 🛠️ Development

### Adding New Features

1. **Backend API**: Add routes in `src/routes/`
2. **Python AI**: Extend modules in `Google_Hackathon-AI/Google_Hackathon-AI/AI Code/`
3. **Frontend**: Modify React components in `Google_Hackathon-Frontend/Google_Hackathon-Frontend/src/`

### Debugging

- Backend logs: Check console output and `logs/` directory
- Python AI logs: Check Python script outputs
- Frontend: Use browser developer tools

## 📦 Deployment

### Production Setup

1. Set environment to production:
```env
NODE_ENV=production
```

2. Build frontend:
```bash
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm run build
```

3. Start production server:
```bash
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile example
FROM node:18-alpine

# Install Python
RUN apk add --no-cache python3 py3-pip

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy application
COPY . .

# Install Python dependencies
RUN cd "Google_Hackathon-AI/Google_Hackathon-AI/AI Code" && pip install -r requirements.txt

EXPOSE 3001
CMD ["npm", "start"]
```

## 🔐 Security

- File uploads are validated and stored securely
- Rate limiting prevents API abuse
- CORS configured for frontend-only access
- Helmet.js provides security headers

## 🐛 Troubleshooting

### Common Issues

1. **"Python bridge not initialized"**:
   - Ensure Python is installed and accessible
   - Check that all Python dependencies are installed
   - Verify the AI Code directory exists

2. **"Gemini API key required"**:
   - Add your API key to the `.env` file
   - Restart the backend server

3. **File upload fails**:
   - Check file size limits
   - Ensure supported file type
   - Verify upload directory permissions

4. **Frontend won't connect**:
   - Ensure backend is running on port 3001
   - Check CORS configuration
   - Verify frontend URL in environment

### Logs

- Backend logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Console output for real-time debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Open an issue on GitHub
4. Contact the development team

---

**Happy coding! 🚀**
