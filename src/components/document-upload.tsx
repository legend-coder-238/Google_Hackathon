"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, X } from 'lucide-react'

interface DocumentUploadProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  onFileRemove: () => void
}

export function DocumentUpload({ onFileSelect, selectedFile, onFileRemove }: DocumentUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false)
  })

  if (selectedFile) {
    return (
      <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for analysis
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onFileRemove}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 border-dashed transition-colors ${
      isDragActive 
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-300 dark:border-gray-600'
    }`}>
      <CardContent className="p-8">
        <div
          {...getRootProps()}
          className="text-center cursor-pointer"
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Upload Legal Document
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Drag and drop your PDF file here, or click to browse
          </p>
          <Button variant="outline">
            Choose File
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Supports PDF files up to 10MB
          </p>
        </div>
      </CardContent>
    </Card>
  )
}