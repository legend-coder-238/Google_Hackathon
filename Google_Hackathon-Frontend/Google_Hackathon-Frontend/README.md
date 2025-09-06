# Legal AI Advisor - Frontend

A modern, responsive frontend for an AI-powered legal document analysis tool built with Next.js, Shadcn/UI, and Clerk authentication.

## Features

- 🔐 **Authentication**: Secure login/signup with Clerk
- 📄 **PDF Upload & Viewer**: Drag-and-drop PDF upload with scrollable viewer
- 💬 **AI Chat Interface**: Real-time chat with AI legal advisor
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile
- 🌙 **Dark/Light Theme**: Toggle between themes
- 📊 **Processing Progress**: Visual feedback for document processing
- 💾 **Chat History**: Previous conversations sidebar
- 🎨 **Modern UI**: Built with Shadcn/UI components

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI
- **Authentication**: Clerk
- **PDF Handling**: react-pdf
- **File Upload**: react-dropzone
- **Icons**: Lucide React
- **Theme**: next-themes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Clerk account for authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd legal-advisor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```

4. **Get Clerk Keys**
   - Sign up at [clerk.com](https://clerk.com)
   - Create a new application
   - Copy the publishable key and secret key from the dashboard
   - Replace the placeholder values in `.env.local`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── chat/
│   │   └── page.tsx          # Main chat interface
│   ├── sign-in/
│   │   └── [[...sign-in]]/
│   │       └── page.tsx      # Sign-in page
│   ├── sign-up/
│   │   └── [[...sign-up]]/
│   │       └── page.tsx      # Sign-up page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── components/
│   ├── ui/                   # Shadcn/UI components
│   ├── chat-interface.tsx    # Chat UI component
│   ├── chat-sidebar.tsx      # Chat history sidebar
│   ├── document-upload.tsx   # File upload component
│   ├── pdf-viewer.tsx        # PDF viewer component
│   ├── theme-provider.tsx    # Theme context provider
│   └── theme-toggle.tsx      # Dark/light mode toggle
├── lib/
│   └── utils.ts              # Utility functions
└── middleware.ts             # Route protection
```

## Key Components

### Authentication Flow
1. Users land on the homepage
2. If not authenticated, redirected to sign-in page
3. After authentication, access to chat interface

### Chat Interface Layout
- **Left Panel**: Previous chat sessions
- **Middle Panel**: Document upload and PDF viewer
- **Right Panel**: AI chat interface

### PDF Processing
- Drag-and-drop or click to upload
- Progress bar shows processing status
- Scrollable PDF viewer with zoom controls
- Page navigation controls

## Customization

### Styling
- Modify `src/app/globals.css` for global styles
- Update Tailwind config in `tailwind.config.js`
- Customize Shadcn/UI theme in `components.json`

### Components
- All UI components are in `src/components/`
- Shadcn/UI components in `src/components/ui/`
- Custom components for chat, PDF viewer, etc.

## Backend Integration

To connect with your AI backend:

1. **Update Chat Interface**
   - Modify `handleSendMessage` in `chat-interface.tsx`
   - Add API calls to your backend

2. **Document Processing**
   - Update `handleFileSelect` in `chat/page.tsx`
   - Integrate with your document processing API

3. **Chat History**
   - Connect `chat-sidebar.tsx` to your database
   - Implement real chat session management

## Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Other Platforms
```bash
npm run build
npm start
```

## Environment Variables for Production

Make sure to set these in your production environment:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- Any additional API endpoints for your backend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the [Issues](../../issues) page
- Review Clerk documentation for auth issues
- Check Next.js documentation for framework questions

---

Built with ❤️ for the hackathon - Demystifying Legal Documents with AI