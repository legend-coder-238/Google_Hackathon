"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Plus, Trash2 } from 'lucide-react'

interface ChatSession {
  id: string
  title: string
  timestamp: Date
  preview: string
}

interface ChatSidebarProps {
  currentChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
}

export function ChatSidebar({ currentChatId, onChatSelect, onNewChat }: ChatSidebarProps) {
  const [chatSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Rental Agreement Analysis',
      timestamp: new Date('2024-01-15'),
      preview: 'Analyzed rental agreement for potential risks...'
    },
    {
      id: '2', 
      title: 'Employment Contract Review',
      timestamp: new Date('2024-01-14'),
      preview: 'Reviewed employment terms and conditions...'
    },
    {
      id: '3',
      title: 'Terms of Service Check',
      timestamp: new Date('2024-01-13'),
      preview: 'Examined privacy policy and data usage...'
    }
  ])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <Button onClick={onNewChat} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Previous Chats
        </h3>
        
        {chatSessions.map((chat) => (
          <Card 
            key={chat.id}
            className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
              currentChatId === chat.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onChatSelect(chat.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium truncate">
                  {chat.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    // Handle delete
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {chat.preview}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {chat.timestamp.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}