"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient, handleApiError } from '@/lib/api'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  mode?: 'qna' | 'summarize' | 'explain'
  sources?: string[]
  error?: boolean
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void
  documentId?: string
  isDocumentReady?: boolean
}

export function ChatInterface({ onSendMessage, documentId, isDocumentReady = false }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I\'m your Legal AI Advisor. Upload a document and I\'ll help you understand its contents, identify potential risks, and answer any questions you have about it.',
      sender: 'ai',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [chatMode, setChatMode] = useState<'qna' | 'summarize' | 'explain'>('qna')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Update welcome message when document is ready
  useEffect(() => {
    if (isDocumentReady && documentId) {
      const welcomeMessage: Message = {
        id: 'doc-ready-' + Date.now(),
        content: 'Great! Your document has been processed and is ready for analysis. You can now ask me questions about it, request a summary, or ask me to explain specific clauses.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, welcomeMessage])
    }
  }, [isDocumentReady, documentId])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      mode: chatMode
    }

    setMessages(prev => [...prev, userMessage])
    const messageText = inputValue
    setInputValue('')
    setIsLoading(true)

    // Call parent callback if provided
    onSendMessage?.(messageText)

    try {
      const response = await apiClient.sendChatMessage(messageText, documentId, chatMode)
      
      if (response.success && response.data) {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: response.data.response,
          sender: 'ai',
          timestamp: new Date(),
          mode: response.data.mode as any,
          sources: response.data.sources
        }
        setMessages(prev => [...prev, aiResponse])
      } else {
        throw new Error(response.message || 'Failed to get AI response')
      }
    } catch (error) {
      const errorMessage = handleApiError(error)
      const aiErrorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        error: true
      }
      setMessages(prev => [...prev, aiErrorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Legal AI Assistant
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {isDocumentReady 
            ? 'Ask questions about your uploaded document' 
            : 'Upload a document to start analyzing'
          }
        </p>
        
        {/* Chat Mode Selector */}
        {isDocumentReady && (
          <div className="mt-3 flex space-x-2">
            <Button
              variant={chatMode === 'qna' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChatMode('qna')}
            >
              Q&A
            </Button>
            <Button
              variant={chatMode === 'summarize' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChatMode('summarize')}
            >
              Summarize
            </Button>
            <Button
              variant={chatMode === 'explain' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChatMode('explain')}
            >
              Explain
            </Button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <Card className={`max-w-[80%] ${
              message.sender === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 dark:bg-gray-800'
            }`}>
              <CardContent className="p-3">
                <div className="flex items-start space-x-2">
                  {message.sender === 'ai' && (
                    <Bot className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      message.error ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  )}
                  {message.sender === 'user' && (
                    <User className="h-5 w-5 text-white mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.error && <AlertCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    
                    {/* Mode and Sources */}
                    {message.mode && message.sender === 'ai' && (
                      <div className="mt-2">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                          {message.mode.toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Sources:</p>
                        <div className="space-y-1">
                          {message.sources.map((source, index) => (
                            <p key={index} className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-1 rounded">
                              {source}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <p className={`text-xs mt-1 ${
                      message.sender === 'user' 
                        ? 'text-blue-100' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <Card className="bg-gray-100 dark:bg-gray-800">
              <CardContent className="p-3">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-blue-600" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Thinking...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isDocumentReady 
                ? chatMode === 'qna' 
                  ? "Ask a question about the document..."
                  : chatMode === 'summarize'
                  ? "Request a summary of the document..."
                  : "Ask me to explain a specific clause..."
                : "Upload a document first to start chatting..."
            }
            className="flex-1"
            disabled={isLoading || !isDocumentReady}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading || !isDocumentReady}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        
        {!isDocumentReady && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Please upload and process a document before starting a conversation.
          </p>
        )}
      </div>
    </div>
  )
}