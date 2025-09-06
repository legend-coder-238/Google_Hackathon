# 🚀 Legal AI Advisor - Complete Setup Guide

Welcome! This guide will help you set up and run the complete Legal AI Advisor application.

## 📋 Prerequisites

Before starting, make sure you have:

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Python 3.8+** - [Download here](https://www.python.org/downloads/)
- **Google Gemini API Key** - [Get one here](https://makersuite.google.com/app/apikey)

## 🎯 Quick Start (Recommended)

### Option 1: Windows Users
```cmd
# Double-click the start.bat file, OR run:
start.bat
```

### Option 2: Linux/Mac Users
```bash
# Make the script executable and run:
chmod +x start.sh
./start.sh
```

The scripts will automatically:
- ✅ Check prerequisites
- ✅ Install all dependencies
- ✅ Set up environment files
- ✅ Start all services

## 🛠️ Manual Setup

If you prefer to set things up manually:

### 1. Environment Configuration

```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your Google Gemini API key:
# GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Install Backend Dependencies

```bash
npm install
```

### 3. Install Python AI Dependencies

```bash
cd "Google_Hackathon-AI/Google_Hackathon-AI/AI Code"
pip install -r requirements.txt
cd ../../..
```

### 4. Install Frontend Dependencies

```bash
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm install
cd ../..
```

### 5. Start Services

**Terminal 1 (Backend):**
```bash
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm run dev
```

## 🌐 Access the Application

Once running, you can access:

- **🖥️ Frontend Application**: http://localhost:3000
- **🔧 Backend API**: http://localhost:3001
- **🏥 Health Check**: http://localhost:3001/api/health

## 🧪 Testing the Application

1. **Sign Up/Login**: Use Clerk authentication at the frontend
2. **Upload Document**: Go to the chat page and upload a legal document
3. **Ask Questions**: Use the chat interface to interact with your document
4. **Try Different Modes**: Switch between Q&A, Summarize, and Explain modes

## 📁 Project Structure

```
Legal-AI-Advisor/
├── src/                          # Backend API (Node.js)
│   ├── server.js                 # Main server
│   ├── routes/                   # API endpoints
│   └── services/                 # Business logic
├── Google_Hackathon-AI/          # Python AI backend
│   └── AI Code/                  # AI processing modules
├── Google_Hackathon-Frontend/    # React frontend
│   └── src/                      # React application
├── start.bat                     # Windows startup script
├── start.sh                      # Linux/Mac startup script
└── README.md                     # Documentation
```

## 🔧 Configuration Options

### Environment Variables (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | `your_api_key_here` |
| `PORT` | Backend port | `3001` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Supported File Types

- PDF (.pdf)
- Microsoft Word (.doc, .docx)
- Plain Text (.txt)

### File Size Limits

- Maximum upload size: 50MB per file

## 🐛 Troubleshooting

### Common Issues

**1. "GEMINI_API_KEY not set"**
- Solution: Add your API key to the `.env` file
- Get a key from: https://makersuite.google.com/app/apikey

**2. "Python bridge not initialized"**
- Solution: Make sure Python is installed and accessible
- Install Python dependencies: `pip install -r requirements.txt`

**3. "Port 3000/3001 already in use"**
- Solution: Stop other applications using these ports
- Or change ports in configuration files

**4. "Module not found" errors**
- Solution: Make sure all dependencies are installed
- Run `npm install` in both backend and frontend directories

**5. Frontend won't load**
- Solution: Make sure both backend and frontend are running
- Check that no firewall is blocking the ports

### Debug Mode

To run with detailed logging:

**Backend:**
```bash
LOG_LEVEL=debug npm run dev
```

**Python AI:**
```bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)/Google_Hackathon-AI/Google_Hackathon-AI/AI Code"
```

### Network Issues

If you're having connectivity issues:

1. Check firewall settings
2. Ensure ports 3000 and 3001 are available
3. Try accessing http://localhost:3001/api/health directly

## 📚 API Documentation

### Main Endpoints

- `GET /api/health` - Health check
- `POST /api/upload` - Upload documents
- `POST /api/chat/message` - Send chat messages
- `GET /api/documents` - List documents
- `DELETE /api/documents/:id` - Delete document

### Example API Usage

```javascript
// Upload a document
const formData = new FormData();
formData.append('document', file);

const response = await fetch('http://localhost:3001/api/upload', {
  method: 'POST',
  body: formData
});

// Send a chat message
const chatResponse = await fetch('http://localhost:3001/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is this document about?',
    documentId: 'doc-id',
    mode: 'qna'
  })
});
```

## 🔒 Security Notes

- Files are stored locally in the `uploads/` directory
- API includes rate limiting and security headers
- Environment variables contain sensitive information
- Always use HTTPS in production

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up reverse proxy (nginx)
4. Use a proper database instead of JSON files
5. Configure SSL certificates
6. Set up proper logging and monitoring

## 🤝 Support

If you encounter issues:

1. Check this troubleshooting guide
2. Review the console logs
3. Check the `logs/` directory for detailed error logs
4. Ensure all prerequisites are met
5. Try restarting the services

## 🎉 Success!

If everything is working correctly, you should see:

- ✅ Backend running on http://localhost:3001
- ✅ Frontend running on http://localhost:3000  
- ✅ Successful document uploads
- ✅ AI responses to your questions

Enjoy using your Legal AI Advisor! 🚀