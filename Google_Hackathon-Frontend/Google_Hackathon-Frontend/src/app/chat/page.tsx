"use client"

import { useState } from 'react'
import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"
import { ChatSidebar } from "@/components/chat-sidebar"
import { DocumentUpload } from "@/components/document-upload"
import { SimplePDFViewer } from "@/components/simple-pdf-viewer"
import { ChatInterface } from "@/components/chat-interface"
import { useAuthenticatedAPI } from "@/lib/useAuthenticatedAPI"
import { Scale, ArrowLeft, LogOut, User, RefreshCw, AlertCircle } from 'lucide-react'

export default function ChatPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const { isAPIAuthenticated, authError, isLoading, retryAuthentication } = useAuthenticatedAPI()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentId, setDocumentId] = useState<string | undefined>()
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | undefined>()
  const [currentChatId, setCurrentChatId] = useState<string>()

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  // Show authentication error if API auth failed
  if (!isAPIAuthenticated && authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full mx-auto p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-4">
                <p>Authentication failed: {authError}</p>
                <div className="flex gap-2">
                  <Button 
                    onClick={retryAuthentication} 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry Authentication
                  </Button>
                  <SignOutButton>
                    <Button variant="outline" size="sm" className="w-full">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </SignOutButton>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  // Show loading while API authentication is in progress
  if (!isAPIAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Authenticating with API...</p>
        </div>
      </div>
    )
  }

  const handleFileSelect = (file: File, docId: string) => {
    setSelectedFile(file)
    setDocumentId(docId)
    setUploadStatus('success')
    setUploadError(undefined)
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
    setDocumentId(undefined)
    setUploadStatus('idle')
    setUploadError(undefined)
  }

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message)
    // Here you would integrate with your AI backend
  }

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
    // Don't clear document data when starting new chat
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
        {/* Left Sidebar - Previous Chats */}
        <div className="w-80 border-r bg-white dark:bg-gray-900">
          <ChatSidebar
            currentChatId={currentChatId}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Middle Section - Document Upload and Viewer */}
        <div className="flex-1 flex flex-col border-r">
          {/* Document Upload Area */}
          <div className="p-4 border-b bg-white dark:bg-gray-900">
            <DocumentUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              onFileRemove={handleFileRemove}
              documentId={documentId}
              uploadStatus={uploadStatus}
              uploadError={uploadError}
            />
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 dark:bg-gray-800">
            <SimplePDFViewer
              file={selectedFile}
              processingProgress={uploadStatus === 'success' ? 100 : uploadStatus === 'processing' ? 50 : 0}
            />
          </div>
        </div>

        {/* Right Section - Chat Interface */}
        <div className="w-96">
          <ChatInterface 
            onSendMessage={handleSendMessage} 
            documentId={documentId}
            isDocumentReady={uploadStatus === 'success' && !!documentId}
          />
        </div>
      </div>
    </div>
  )
}