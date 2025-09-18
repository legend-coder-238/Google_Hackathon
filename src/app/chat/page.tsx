"use client"

import { useState } from 'react'
import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ChatSidebar } from "@/components/chat-sidebar"
import { DocumentUpload } from "@/components/document-upload"
import { ReliablePDFViewer } from "@/components/reliable-pdf-viewer"
import { ChatInterface } from "@/components/chat-interface"
import { Scale, ArrowLeft, LogOut, User } from 'lucide-react'

export default function ChatPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [currentChatId, setCurrentChatId] = useState<string>()

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    // Simulate processing
    setProcessingProgress(0)
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
    setProcessingProgress(0)
  }

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message)
    // Here you would integrate with your AI backend
  }

  const handleDocumentSelect = (docId: string) => {
    setCurrentChatId(docId)
    // In a real app, you would load the document data here
  }

  const handleNewDocument = () => {
    setCurrentChatId(undefined)
    setSelectedFile(null)
    setProcessingProgress(0)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="flex items-center space-x-2">
              <Scale className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Legal AI Advisor
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <User className="h-4 w-4" />
              <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
            </div>
            
            <ThemeToggle />
            
            {/* Logout Button */}
            <SignOutButton>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Document Management */}
        <div className="w-80 border-r bg-white dark:bg-gray-900">
          <ChatSidebar
            currentDocId={currentChatId}
            onDocumentSelect={handleDocumentSelect}
            onNewDocument={handleNewDocument}
          />
        </div>

        {/* Middle Section - PDF Viewer (Full Area) */}
        <div className="flex-1 flex flex-col">
          {/* Document Upload Area - Compact */}
          {!selectedFile && (
            <div className="p-4 border-b bg-white dark:bg-gray-900">
              <DocumentUpload
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onFileRemove={handleFileRemove}
              />
            </div>
          )}

          {/* PDF Viewer - Takes Full Remaining Space */}
          <div className="flex-1">
            <ReliablePDFViewer
              file={selectedFile}
              processingProgress={processingProgress}
            />
          </div>
        </div>

        {/* Right Section - Chat Interface */}
        <div className="w-96 border-l">
          <ChatInterface onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}