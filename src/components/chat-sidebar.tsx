"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Trash2, Clock, AlertTriangle, CheckCircle, Upload, Search, Filter } from 'lucide-react'

interface DocumentSession {
  id: string
  fileName: string
  documentType: string
  uploadDate: Date
  status: 'processing' | 'analyzed' | 'error'
  riskLevel: 'low' | 'medium' | 'high'
  keyFindings: string[]
  fileSize: string
}

interface DocumentSidebarProps {
  currentDocId?: string
  onDocumentSelect: (docId: string) => void
  onNewDocument: () => void
}

export function ChatSidebar({ currentDocId, onDocumentSelect, onNewDocument }: DocumentSidebarProps) {
  const [documents] = useState<DocumentSession[]>([
    {
      id: '1',
      fileName: 'rental_agreement.pdf',
      documentType: 'Rental Agreement',
      uploadDate: new Date('2024-01-15'),
      status: 'analyzed',
      riskLevel: 'medium',
      keyFindings: ['Security deposit clause', 'Early termination fees', 'Maintenance responsibilities'],
      fileSize: '2.4 MB'
    },
    {
      id: '2',
      fileName: 'employment_contract.pdf',
      documentType: 'Employment Contract',
      uploadDate: new Date('2024-01-14'),
      status: 'analyzed',
      riskLevel: 'low',
      keyFindings: ['Non-compete clause', 'Salary structure', 'Benefits package'],
      fileSize: '1.8 MB'
    },
    {
      id: '3',
      fileName: 'terms_of_service.pdf',
      documentType: 'Terms of Service',
      uploadDate: new Date('2024-01-13'),
      status: 'processing',
      riskLevel: 'high',
      keyFindings: ['Data collection', 'Liability limitations'],
      fileSize: '3.2 MB'
    }
  ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'analyzed': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getRiskBadge = (risk: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
    return colors[risk as keyof typeof colors] || colors.low
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <Button onClick={onNewDocument} className="w-full mb-3">
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Recent Documents
          </h3>
          <Badge variant="secondary" className="text-xs">
            {documents.length}
          </Badge>
        </div>

        {documents.map((doc) => (
          <Card
            key={doc.id}
            className={`cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${currentDocId === doc.id ? 'ring-2 ring-blue-500' : ''
              }`}
            onClick={() => onDocumentSelect(doc.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm font-medium truncate">
                      {doc.fileName}
                    </CardTitle>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.documentType}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 flex-shrink-0"
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
              {/* Status and Risk */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1">
                  {getStatusIcon(doc.status)}
                  <span className="text-xs capitalize text-gray-600 dark:text-gray-300">
                    {doc.status}
                  </span>
                </div>
                <Badge className={`text-xs ${getRiskBadge(doc.riskLevel)}`}>
                  {doc.riskLevel} risk
                </Badge>
              </div>

              {/* Key Findings */}
              {doc.status === 'analyzed' && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Key findings:</p>
                  <div className="space-y-1">
                    {doc.keyFindings.slice(0, 2).map((finding, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <div className="w-1 h-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 truncate">
                          {finding}
                        </span>
                      </div>
                    ))}
                    {doc.keyFindings.length > 2 && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        +{doc.keyFindings.length - 2} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* File Info */}
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{doc.fileSize}</span>
                <span>{doc.uploadDate.toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{documents.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Analyzed</p>
            <p className="text-sm font-semibold text-green-600">
              {documents.filter(d => d.status === 'analyzed').length}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">High Risk</p>
            <p className="text-sm font-semibold text-red-600">
              {documents.filter(d => d.riskLevel === 'high').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}