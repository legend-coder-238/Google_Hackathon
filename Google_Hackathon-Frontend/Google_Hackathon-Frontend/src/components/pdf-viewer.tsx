"use client"

import { useState, useEffect } from 'react'
import { Progress } from "@/components/ui/progress"
import { FileText, Download, ExternalLink } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"

// Simple PDF viewer without react-pdf for now
// This avoids the worker loading issues during development

interface PDFViewerProps {
  file: File | null
  processingProgress: number
}

export function PDFViewer({ file, processingProgress }: PDFViewerProps) {
  const [fileUrl, setFileUrl] = useState<string>('')

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setFileUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file])

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No document selected</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Upload a PDF to view it here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
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

      {/* Document Info */}
      <div className="p-4 border-b bg-white dark:bg-gray-900">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-red-600" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {file.name}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {(file.size / 1024 / 1024).toFixed(2)} MB • PDF Document
            </p>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4">
        <Card className="h-full">
          <CardContent className="p-0 h-full">
            {processingProgress === 100 ? (
              <iframe
                src={fileUrl}
                className="w-full h-full border-0 rounded-lg"
                title="PDF Viewer"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">
                    Processing document...
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alternative: Show PDF info if iframe doesn't work */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Download className="h-4 w-4" />
          <span>
            <a href={fileUrl} download={file.name}>
              Download PDF
            </a>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <ExternalLink className="h-4 w-4" />
          <span>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              Open in new tab
            </a>
          </span>
        </div>
      </div>
    </div>
  )
}