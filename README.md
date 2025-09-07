# 🚀 Legal AI Advisor - Deployment Guide

## ✅ **Can this run on other computers?**
**YES!** This application is designed to be portable and can run on any computer that meets the system requirements.

## 📋 **System Requirements**

### **Minimum Requirements:**
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 18.04+)
- **Node.js**: Version 18.0 or higher
- **Python**: Version 3.8 or higher
- **RAM**: 4GB minimum (8GB recommended for better AI performance)
- **Storage**: 2GB free space for dependencies and runtime files
- **Internet**: Required for AI API calls and initial setup

### **Recommended Requirements:**
- **RAM**: 8GB+ for optimal AI processing
- **CPU**: Multi-core processor (AI operations are CPU intensive)
- **Storage**: 5GB+ free space for documents and cache
- **Internet**: Stable broadband connection for Gemini AI API

## 📦 **What's Included in the Package**

When you transfer this project to another computer, make sure to include:

### **Essential Files:**
```
Google_Hackathon-Backend/
├── src/                          # Backend source code
├── Google_Hackathon-AI/          # Python AI modules
├── Google_Hackathon-Frontend/    # React frontend
├── package.json                  # Node.js dependencies
├── package-lock.json            # Locked dependency versions
├── start.bat                     # Windows startup script
├── start.sh                      # Linux/Mac startup script
├── SETUP.md                      # Setup instructions
├── DEPLOYMENT_GUIDE.md           # This file
├── .env.example                  # Environment template
└── prisma/                       # Database schema
```

### **Files to EXCLUDE (should not be transferred):**
```
❌ node_modules/              # Dependencies (auto-installed)
❌ .env                       # Contains API keys (security risk)
❌ uploads/                   # User uploaded files
❌ logs/                      # Log files
❌ dev.db                     # Development database
❌ .git/                      # Git repository (optional)
```

## 🔧 **Step-by-Step Deployment**

### **Step 1: Transfer Files**
1. Copy the entire project folder to the target computer
2. **IMPORTANT**: Do NOT copy the `.env` file (contains sensitive API keys)
3. Ensure all source code files are transferred correctly

### **Step 2: Install Prerequisites**
On the target computer, install:

**Node.js 18+:**
- Windows/Mac: Download from https://nodejs.org/
- Linux: `sudo apt update && sudo apt install nodejs npm`

**Python 3.8+:**
- Windows/Mac: Download from https://python.org/downloads/
- Linux: `sudo apt update && sudo apt install python3 python3-pip`

**Verify installations:**
```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 8.x.x or higher
python --version  # Should show 3.8.x or higher
pip --version     # Should show pip version
```

### **Step 3: Get API Keys**
The new user needs to obtain their own API keys:

**Google Gemini API Key:**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Create a new API key
4. Copy the key (keep it secure!)

**Clerk Authentication (Optional):**
1. Go to https://clerk.dev/
2. Create an account and new application
3. Get the publishable and secret keys

### **Step 4: Environment Setup**
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` file and add the API keys:
   ```bash
   GEMINI_API_KEY=your_actual_gemini_api_key_here
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   ```

### **Step 5: Easy Installation & Startup**

**Option A: Automatic Setup (Recommended)**
```bash
# Windows:
.\start.bat

# Linux/Mac:
chmod +x start.sh
./start.sh
```

**Option B: Manual Setup**
```bash
# 1. Install backend dependencies
npm install

# 2. Install Python AI dependencies
cd "Google_Hackathon-AI/Google_Hackathon-AI/AI Code"
pip install -r requirements.txt
cd ../../..

# 3. Install frontend dependencies
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm install
cd ../..

# 4. Start backend (Terminal 1)
npm run dev

# 5. Start frontend (Terminal 2)
cd "Google_Hackathon-Frontend/Google_Hackathon-Frontend"
npm run dev
```

## 🌐 **Access the Application**

Once running, access at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🔒 **Security Considerations**

### **For Deployment:**
1. **Never share `.env` files** - they contain sensitive API keys
2. **Use your own API keys** - don't use someone else's keys
3. **Keep API keys secure** - treat them like passwords
4. **Use HTTPS in production** - for secure communication

### **For Production Deployment:**
If deploying to a server (not just local use):
1. Use environment variables instead of `.env` files
2. Set up SSL certificates
3. Use a reverse proxy (nginx/apache)
4. Implement proper logging and monitoring
5. Use a production database (PostgreSQL/MySQL)

## 🐛 **Common Issues & Solutions**

### **Issue: "GEMINI_API_KEY not set"**
**Solution**: 
1. Check if `.env` file exists in root directory
2. Verify the API key is correctly set in `.env`
3. Restart the application after adding the key

### **Issue: "Port already in use"**
**Solution**: 
1. Check if other applications are using ports 3000/3001
2. Kill existing processes: `npx kill-port 3000 3001`
3. Or change ports in configuration files

### **Issue: "Python dependencies not found"**
**Solution**:
1. Ensure Python 3.8+ is installed
2. Run: `cd "Google_Hackathon-AI/Google_Hackathon-AI/AI Code" && pip install -r requirements.txt`
3. Check if `pip` is in system PATH

### **Issue: "Module not found" errors**
**Solution**:
1. Delete `node_modules` folders and run `npm install` again
2. Ensure Node.js 18+ is installed
3. Check internet connection for package downloads

### **Issue: Frontend won't load**
**Solution**:
1. Ensure both backend and frontend are running
2. Check browser console for errors
3. Verify no firewall is blocking the ports
4. Clear browser cache and try again

## 📊 **Performance Optimization**

### **For Better Performance:**
1. **RAM**: 8GB+ recommended for large document processing
2. **Storage**: SSD recommended for faster file operations
3. **Network**: Stable internet for AI API calls
4. **CPU**: Multi-core processor for concurrent operations

### **Scaling Options:**
1. **Docker**: Containerize for easier deployment
2. **Cloud**: Deploy to AWS/Azure/GCP for better performance
3. **Load Balancer**: For multiple instances
4. **CDN**: For faster frontend loading

## ✅ **Success Checklist**

Before considering deployment successful, verify:

- [ ] Node.js 18+ installed and accessible
- [ ] Python 3.8+ installed with pip
- [ ] All dependencies installed successfully
- [ ] API keys configured in `.env` file
- [ ] Backend starts without errors on port 3001
- [ ] Frontend starts without errors on port 3000
- [ ] Health check returns success: http://localhost:3001/api/health
- [ ] Can upload a document successfully
- [ ] AI chat/summary features work
- [ ] No console errors in browser

## 📞 **Support**

If you encounter issues during deployment:

1. **Check logs**: Look in the terminal output for error messages
2. **Verify prerequisites**: Ensure all requirements are met
3. **Test step-by-step**: Follow the manual setup to isolate issues
4. **Check network**: Ensure internet connection for AI API calls
5. **Review this guide**: Make sure all steps were followed correctly

## 🎉 **Conclusion**

**YES, this application will run on other computers!** 

The key requirements are:
1. ✅ **System Requirements Met** (Node.js 18+, Python 3.8+)
2. ✅ **API Keys Configured** (Google Gemini API key)
3. ✅ **Dependencies Installed** (automated by startup scripts)
4. ✅ **Network Access** (for AI API calls)

The startup scripts (`start.bat` for Windows, `start.sh` for Linux/Mac) handle most of the complexity automatically, making deployment straightforward for end users.
