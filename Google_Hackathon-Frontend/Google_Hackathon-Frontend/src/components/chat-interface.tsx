"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Bot, User, AlertCircle, Loader2 } from 'lucide-react'
import { apiClient, handleApiError, ChatMessage } from '@/lib/api'

interface Message {
  id: string
  content: string
  sender: 'user' | 'ai'
  timestamp: Date
  mode?: 'qna' | 'summarize' | 'explain'
  sources?: string[]
  error?: boolean
  isLoading?: boolean
}

interface ChatInterfaceProps {
  onSendMessage?: (message: string) => void
  documentId?: string
  isDocumentReady?: boolean
  selectedSessionId?: string
  selectedSessionData?: { sessionId: string; messages: ChatMessage[] } | null
}

export function ChatInterface({ 
  onSendMessage, 
  documentId, 
  isDocumentReady = false, 
  selectedSessionId,
  selectedSessionData 
}: ChatInterfaceProps) {
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
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [chatMode, setChatMode] = useState<'qna' | 'summarize' | 'explain'>('qna')
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load chat history when document changes OR when a session is selected
  useEffect(() => {
    const loadChatHistory = async () => {
      // If a specific session is selected, load its messages
      if (selectedSessionId && selectedSessionData) {
        setIsLoadingHistory(true)
        try {
          // Convert session messages to UI messages
          const historicalMessages: Message[] = selectedSessionData.messages?.map((msg: ChatMessage) => ([
            {
              id: `user-${msg.id}`,
              content: msg.message,
              sender: 'user' as const,
              timestamp: new Date(msg.timestamp),
              mode: msg.mode
            },
            {
              id: `ai-${msg.id}`,
              content: msg.response,
              sender: 'ai' as const,
              timestamp: new Date(msg.timestamp),
              mode: msg.mode,
              sources: msg.sources
            }
          ])).flat() || []

          if (historicalMessages.length > 0) {
            setMessages([
              {
                id: '1',
                content: 'Continuing previous conversation...',
                sender: 'ai',
                timestamp: new Date()
              },
              ...historicalMessages
            ])
          } else {
            // Empty session, show welcome message
            setMessages([
              {
                id: '1',
                content: 'Hello! I\'m your Legal AI Advisor. Continue this conversation or upload a document to start analyzing.',
                sender: 'ai',
                timestamp: new Date()
              }
            ])
          }
          
          // Set the session ID for continued conversation
          setCurrentSessionId(selectedSessionId)
          
        } catch (error) {
          console.error('Failed to load session messages:', error)
        } finally {
          setIsLoadingHistory(false)
        }
        return
      }
      
      // If no session is selected, check if we have a document to load history for
      if (documentId && apiClient.isAuthenticated() && !selectedSessionId) {
        setIsLoadingHistory(true)
        try {
          const response = await apiClient.getChatHistory(documentId)
          if (response.success && response.data && response.data.history) {
            // Convert API messages to UI messages
            const historicalMessages: Message[] = response.data.history.map((msg: ChatMessage) => ([
              {
                id: `user-${msg.id}`,
                content: msg.message,
                sender: 'user' as const,
                timestamp: new Date(msg.timestamp),
                mode: msg.mode
              },
              {
                id: `ai-${msg.id}`,
                content: msg.response,
                sender: 'ai' as const,
                timestamp: new Date(msg.timestamp),
                mode: msg.mode,
                sources: msg.sources
              }
            ])).flat()

            if (historicalMessages.length > 0) {
              setMessages([
                {
                  id: '1',
                  content: 'Hello! I\'m your Legal AI Advisor. Here\'s our previous conversation about this document.',
                  sender: 'ai',
                  timestamp: new Date()
                },
                ...historicalMessages
              ])
            } else {
              // No history, show welcome message for this document
              setMessages([
                {
                  id: '1',
                  content: 'Hello! I\'m your Legal AI Advisor. I see you\'ve uploaded a document. I can help you understand its contents, identify potential risks, and answer any questions you have about it.',
                  sender: 'ai',
                  timestamp: new Date()
                }
              ])
            }
          }
        } catch (error) {
          console.error('Failed to load chat history:', error)
          // Keep the default welcome message
        } finally {
          setIsLoadingHistory(false)
        }
      } else if (!selectedSessionId && !documentId) {
        // No session and no document - fresh start
        setMessages([
          {
            id: '1',
            content: 'Hello! I\'m your Legal AI Advisor. Upload a document and I\'ll help you understand its contents, identify potential risks, and answer any questions you have about it.',
            sender: 'ai',
            timestamp: new Date()
          }
        ])
        setCurrentSessionId(null)
      }
    }

    loadChatHistory()
  }, [documentId, selectedSessionId, selectedSessionData])

  // Update welcome message when document is ready
  useEffect(() => {
    if (isDocumentReady && documentId && messages.length === 1) {
      const welcomeMessage: Message = {
        id: 'doc-ready-' + Date.now(),
        content: 'Great! Your document has been processed and is ready for analysis. You can now ask me questions about it, request a summary, or ask me to explain specific clauses.',
        sender: 'ai',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, welcomeMessage])
    }
  }, [isDocumentReady, documentId, messages.length])

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

    // Add a loading message for longer operations
    const loadingMessage: Message = {
      id: 'loading-' + Date.now(),
      content: chatMode === 'summarize' 
        ? 'Analyzing the document and generating a comprehensive summary. This may take up to 2 minutes...' 
        : chatMode === 'explain'
        ? 'Analyzing the clause and preparing a detailed explanation...'
        : 'Processing your question...',
      sender: 'ai',
      timestamp: new Date(),
      isLoading: true
    }
    setMessages(prev => [...prev, loadingMessage])

    // Call parent callback if provided
    onSendMessage?.(messageText)

    try {
      const response = await apiClient.sendChatMessage(messageText, documentId, chatMode, currentSessionId || undefined)
      
      if (response.success && response.data) {
        // Store session ID for future messages
        if (response.data.sessionId && !currentSessionId) {
          setCurrentSessionId(response.data.sessionId)
        }
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: response.data.response,
          sender: 'ai',
          timestamp: new Date(),
          mode: response.data.mode as 'qna' | 'summarize' | 'explain',
          sources: response.data.sources
        }
        
        // Remove loading message and add actual response
        setMessages(prev => {
          const filtered = prev.filter(msg => !msg.isLoading)
          return [...filtered, aiResponse]
        })
      } else {
        throw new Error(response.message || 'Failed to get AI response')
      }
    } catch (error) {
      let errorMessage = handleApiError(error)
      
      // Handle timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        errorMessage = 'Request timeout: The AI is taking longer than expected to process your request. This often happens with complex documents or summarization requests. Please try again.'
      } else if (errorMessage.includes('timeout') || errorMessage.includes('408')) {
        errorMessage = 'The AI processing is taking longer than expected. Please try again with a shorter request or wait a moment before retrying.'
      }
      
      const aiErrorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.`,
        sender: 'ai',
        timestamp: new Date(),
        error: true
      }
      
      // Remove loading message and add error response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading)
        return [...filtered, aiErrorResponse]
      })
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
          {selectedSessionId
            ? 'Continue this conversation or upload a new document'
            : isDocumentReady 
            ? 'Ask questions about your uploaded document' 
            : 'Upload a document to start analyzing'
          }
        </p>
        
        {/* Chat Mode Selector */}
        {(isDocumentReady || selectedSessionId) && (
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
        {isLoadingHistory ? (
          <div className="flex justify-center items-center h-32">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Loading chat history...</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
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
                        {message.isLoading ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <p className="text-sm whitespace-pre-wrap text-blue-600">{message.content}</p>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
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
          ))
        )}
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
              selectedSessionId
                ? "Continue this conversation..."
                : isDocumentReady 
                ? chatMode === 'qna' 
                  ? "Ask a question about the document..."
                  : chatMode === 'summarize'
                  ? "Request a summary of the document..."
                  : "Ask me to explain a specific clause..."
                : "Upload a document first to start chatting..."
            }
            className="flex-1"
            disabled={isLoading || (!isDocumentReady && !selectedSessionId)}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputValue.trim() || isLoading || (!isDocumentReady && !selectedSessionId)}
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