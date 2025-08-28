"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { FileText, Download, ExternalLink, AlertCircle } from 'lucide-react'

interface SimplePDFViewerProps {
  file: File | null
  processingProgress: number
}

export function SimplePDFViewer({ file, processingProgress }: SimplePDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('')
  const [viewerError, setViewerError] = useState(false)

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setFileUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  const handleDownload = () => {
    if (fileUrl) {
      const a = document.createElement('a')
      a.href = fileUrl
      a.download = file?.name || 'document.pdf'
      a.click()
    }
  }

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Document Selected
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Upload a PDF document to start analyzing
          </p>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Supported formats: PDF (up to 10MB)
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Processing Progress */}
      {processingProgress < 100 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Processing Document...
            </span>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {processingProgress}%
            </span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      )}

      {/* Document Header */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-red-600" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {file.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenInNewTab}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Viewer Area */}
      <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-800">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            {processingProgress === 100 ? (
              !viewerError ? (
                <iframe
                  src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                  className="w-full h-full border-0 rounded-lg"
                  title="PDF Document Viewer"
                  onError={() => setViewerError(true)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center max-w-md">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      PDF Viewer Not Available
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Your browser doesn't support inline PDF viewing, but the document has been uploaded successfully.
                    </p>
                    <div className="space-y-2">
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
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Processing Document
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    AI is analyzing your document...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Document ready for AI analysis</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {processingProgress === 100 ? 'Ready to chat' : 'Processing...'}
          </div>
        </div>
      </div>
    </div>
  )
}