"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Download,
  ExternalLink,
  FileText,
  AlertCircle,
  Loader2,
  Maximize2,
  RotateCw
} from 'lucide-react'

interface ReliablePDFViewerProps {
  file: File | null
  processingProgress: number
}

export function ReliablePDFViewer({ file, processingProgress }: ReliablePDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('')
  const [viewerError, setViewerError] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setFileUrl(url)
      setViewerError(false)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  const handleDownload = () => {
    if (fileUrl && file) {
      const a = document.createElement('a')
      a.href = fileUrl
      a.download = file.name
      a.click()
    }
  }

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <div className="text-center max-w-lg p-8">
          <div className="relative mb-8">
            <FileText className="h-24 w-24 text-gray-300 dark:text-gray-600 mx-auto" />
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">AI</span>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Ready to Analyze Legal Documents
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Upload a PDF document to get started with AI-powered legal analysis. 
            I'll help you understand complex terms, identify risks, and answer your questions.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">Upload PDF</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Drag & drop or click</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <AlertCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">AI Analysis</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Instant insights</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="font-medium text-gray-900 dark:text-white">Ask Questions</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Get explanations</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-white dark:bg-gray-900 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Processing Progress */}
      {processingProgress < 100 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  AI is analyzing your document...
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Extracting key terms, clauses, and potential risks
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              {processingProgress}%
            </span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      )}

      {/* Document Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <FileText className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {file.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4">
        {processingProgress < 100 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="relative mb-6">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Analyzing Legal Document
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Our AI is reading through your document to identify key clauses, 
                potential risks, and important terms.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  This usually takes 10-30 seconds depending on document length
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Card className="h-full shadow-lg">
            <CardContent className="p-0 h-full">
              {!viewerError ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF Document Viewer"
                  onError={() => setViewerError(true)}
                />
              ) : (
                <div className="h-full flex items-center justify-center p-8">
                  <div className="text-center max-w-md">
                    <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      PDF Viewer Unavailable
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Your browser doesn't support inline PDF viewing, but the document 
                      has been uploaded successfully and is ready for AI analysis.
                    </p>
                    <div className="space-y-3">
                      <Button onClick={handleOpenInNewTab} className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </Button>
                      <Button variant="outline" onClick={handleDownload} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              processingProgress === 100 ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-gray-600 dark:text-gray-400">
              {processingProgress === 100 
                ? 'Document ready - Ask me anything about this document!' 
                : 'Processing document for AI analysis...'
              }
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {processingProgress === 100 ? 'Ready to chat' : `${processingProgress}% complete`}
          </div>
        </div>
      </div>
    </div>
  )
}