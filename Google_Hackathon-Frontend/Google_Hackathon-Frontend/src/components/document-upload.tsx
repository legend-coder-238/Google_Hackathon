"use client"

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, X, AlertCircle, CheckCircle } from 'lucide-react'
import { apiClient, isValidFileType, formatFileSize, handleApiError } from '@/lib/api'
import { Progress } from "@/components/ui/progress"

interface DocumentUploadProps {
  onFileSelect: (file: File, documentId: string) => void
  selectedFile: File | null
  onFileRemove: () => void
  uploadStatus?: 'idle' | 'uploading' | 'processing' | 'success' | 'error'
  uploadError?: string
}

export function DocumentUpload({ 
  onFileSelect, 
  selectedFile, 
  onFileRemove, 
  uploadStatus = 'idle',
  uploadError 
}: DocumentUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    
    // Validate file type
    if (!isValidFileType(file)) {
      setLocalError('Please upload a valid file type (PDF, DOC, DOCX, or TXT)')
      return
    }
    
    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setLocalError('File size must be less than 50MB')
      return
    }
    
    setLocalError(null)
    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const response = await apiClient.uploadDocument(file, (progress) => {
        setUploadProgress(progress)
      })
      
      if (response.success && response.data) {
        onFileSelect(file, response.data.documentId)
        setUploadProgress(100)
      } else {
        throw new Error(response.message || 'Upload failed')
      }
    } catch (error) {
      const errorMessage = handleApiError(error)
      setLocalError(errorMessage)
      setUploadProgress(0)
    } finally {
      setIsUploading(false)
    }
  }, [onFileSelect])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
    disabled: isUploading || uploadStatus === 'uploading',
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
    onDropAccepted: () => setIsDragActive(false),
    onDropRejected: () => setIsDragActive(false)
  })

  if (selectedFile) {
    return (
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FileText className="h-8 w-8 text-red-600" />
                {uploadStatus === 'success' && (
                  <CheckCircle className="absolute -top-1 -right-1 h-4 w-4 text-green-500 bg-white rounded-full" />
                )}
                {uploadStatus === 'error' && (
                  <AlertCircle className="absolute -top-1 -right-1 h-4 w-4 text-red-500 bg-white rounded-full" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(selectedFile.size)}
                </p>
                {isUploading && (
                  <div className="mt-2">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-blue-600 mt-1">
                      Uploading... {uploadProgress}%
                    </p>
                  </div>
                )}
                {uploadStatus === 'uploading' && !isUploading && (
                  <p className="text-xs text-blue-600">Uploading...</p>
                )}
                {uploadStatus === 'processing' && (
                  <p className="text-xs text-yellow-600">Processing...</p>
                )}
                {uploadStatus === 'success' && (
                  <p className="text-xs text-green-600">Ready for analysis</p>
                )}
                {uploadStatus === 'error' && (
                  <p className="text-xs text-red-600">{uploadError || 'Upload failed'}</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onFileRemove}
              disabled={uploadStatus === 'uploading'}
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
        : isUploading
        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
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
            {isUploading ? 'Uploading your document...' : 'Drag and drop your legal document here, or click to browse'}
          </p>
          <Button variant="outline" disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Choose File'}
          </Button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Supports PDF, DOC, DOCX, and TXT files up to 50MB
          </p>
          {(localError || uploadError) && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {localError || uploadError}
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}