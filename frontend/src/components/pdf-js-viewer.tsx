"use client"

import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Maximize2,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react'

// PDF.js types
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface PDFJSViewerProps {
  file: File | null
  processingProgress: number
}

export function PDFJSViewer({ file, processingProgress }: PDFJSViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)
  const [pdfDoc, setPdfDoc] = useState<any>(null)
  const [pageNum, setPageNum] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [scale, setScale] = useState(1.2)
  const [rotation, setRotation] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfLoaded, setPdfLoaded] = useState(false)

  // Load PDF.js
  useEffect(() => {
    const loadPDFJS = async () => {
      if (!window.pdfjsLib) {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
        document.head.appendChild(script)
      }
    }
    loadPDFJS()
  }, [])

  // Load PDF when file changes
  useEffect(() => {
    if (file && window.pdfjsLib && processingProgress === 100) {
      loadPDF()
    }
  }, [file, processingProgress])

  const loadPDF = async () => {
    if (!file || !window.pdfjsLib) return

    setLoading(true)
    setError(null)
    
    try {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise
      
      setPdfDoc(pdf)
      setPageCount(pdf.numPages)
      setPageNum(1)
      setPdfLoaded(true)
      
      // Render first page
      renderPage(pdf, 1)
    } catch (err) {
      console.error('Error loading PDF:', err)
      setError('Failed to load PDF. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const renderPage = async (pdf: any, pageNumber: number) => {
    if (!pdf || !canvasRef.current) return

    // Cancel any existing render task
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel()
      renderTaskRef.current = null
    }

    setLoading(true)
    setError(null)
    
    try {
      const page = await pdf.getPage(pageNumber)
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')
      
      if (!context) return

      // Calculate viewport
      const viewport = page.getViewport({ 
        scale: scale,
        rotation: rotation 
      })
      
      // Set canvas dimensions
      canvas.height = viewport.height
      canvas.width = viewport.width
      
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height)
      
      // Render page with proper cleanup
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      }
      
      renderTaskRef.current = page.render(renderContext)
      await renderTaskRef.current.promise
      renderTaskRef.current = null
      
    } catch (err: any) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', err)
        setError('Failed to render page.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Re-render when page, scale, or rotation changes
  useEffect(() => {
    if (pdfDoc && pdfLoaded) {
      renderPage(pdfDoc, pageNum)
    }
  }, [pdfDoc, pageNum, scale, rotation, pdfLoaded])

  const goToPrevPage = () => {
    if (pageNum > 1) {
      setPageNum(pageNum - 1)
    }
  }

  const goToNextPage = () => {
    if (pageNum < pageCount) {
      setPageNum(pageNum + 1)
    }
  }

  const zoomIn = () => {
    setScale(Math.min(scale + 0.2, 3.0))
  }

  const zoomOut = () => {
    setScale(Math.max(scale - 0.2, 0.5))
  }

  const rotate = () => {
    setRotation((rotation + 90) % 360)
  }

  const downloadPDF = () => {
    if (file) {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!file) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-800">
        <div className="text-center max-w-md">
          <FileText className="h-20 w-20 text-gray-400 mx-auto mb-6" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
            No Document Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Upload a PDF document to start analyzing with AI
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 Tip: Drag and drop your PDF file or click the upload button above
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Processing Progress */}
      {processingProgress < 100 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Processing Document...
              </span>
            </div>
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {processingProgress}%
            </span>
          </div>
          <Progress value={processingProgress} className="h-2" />
        </div>
      )}

      {/* PDF Controls */}
      {processingProgress === 100 && (
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 dark:bg-gray-800">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPrevPage}
              disabled={pageNum <= 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">
                Page {pageNum} of {pageCount}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={goToNextPage}
              disabled={pageNum >= pageCount || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Document Info */}
          <div className="hidden md:flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
            <span>{file.name}</span>
            <span>•</span>
            <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
          </div>
          
          {/* Zoom and Action Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={zoomOut} disabled={loading}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <span className="text-sm font-medium min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            
            <Button variant="outline" size="sm" onClick={zoomIn} disabled={loading}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={rotate} disabled={loading}>
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={downloadPDF}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* PDF Viewer Area */}
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800 p-4">
        {processingProgress < 100 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Analyzing Document
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                AI is processing your legal document...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Error Loading PDF
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {error}
              </p>
              <Button onClick={loadPDF} variant="outline">
                Try Again
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <Card className="shadow-lg">
              <CardContent className="p-0">
                {loading && (
                  <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 flex items-center justify-center z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="max-w-full h-auto border border-gray-200 dark:border-gray-700 rounded-lg"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>
              {pdfLoaded ? 'Document ready for analysis' : 'Loading document...'}
            </span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {pdfLoaded ? `${pageCount} pages loaded` : 'Preparing viewer...'}
          </div>
        </div>
      </div>
    </div>
  )
}