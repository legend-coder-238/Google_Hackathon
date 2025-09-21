"use client"

import { useState } from 'react'
import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ClauseExtractionSidebar } from "@/components/clause-extraction-sidebar"
import { DocumentUpload } from "@/components/document-upload"
import { ReliablePDFViewer } from "@/components/reliable-pdf-viewer"
import { ChatInterface } from "@/components/chat-interface"
import { Scale, ArrowLeft, LogOut, User, FileText, MessageSquare } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function ChatPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [currentChatId, setCurrentChatId] = useState<string>()
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [clauseData, setClauseData] = useState<any>(null) // This will be populated from backend
  const [targetPage, setTargetPage] = useState<number | undefined>(undefined)

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!isSignedIn) {
    router.push('/sign-in')
    return null
  }

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setClauseData(null) // Reset clause data for new file
    // Simulate processing
    setProcessingProgress(0)
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
    setProcessingProgress(0)
    setClauseData(null) // Reset clause data
  }

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message)
    // Here you would integrate with your AI backend
  }

  const handleClauseClick = (clause: any) => {
    console.log('Clause clicked:', clause)
    // Here you would handle clause selection, maybe highlight it in the PDF
  }

  const handleGoToPage = (pageNumber: number) => {
    console.log('Go to page:', pageNumber)
    setTargetPage(pageNumber)
    // Show a brief notification that we're navigating
    // You could add a toast notification here if desired
  }

  const handleNewChat = () => {
    // Reset all chat-related state for a fresh conversation
    setSelectedFile(null)
    setProcessingProgress(0)
    setClauseData(null)
    setTargetPage(undefined)
    setIsSummarizing(false)
    console.log('Starting new chat session')
    // TODO: Clear chat history when chat functionality is implemented
  }

  // Sample data for testing - this will be replaced with actual backend data
  const loadSampleData = () => {
    const sampleData = {
      "summary": "Document Analysis: AGREEMENT AND PLAN OF MERGER (Merger Agreement) Identified 6 concerning clauses: 2 critical, 4 high-risk. This document contains critical issues requiring immediate legal review and likely negotiation before signing.",
      "clauses": [
        {
          "clause_title": "Section 3.09. No Undisclosed Liabilities",
          "clause_summary": "The Company warrants that there are no undisclosed liabilities. This clause is crucial as undisclosed liabilities could significantly impact the value and financial health of the merged entity.",
          "risk_level": "CRITICAL",
          "risk_explanation": "Undisclosed liabilities could lead to substantial financial losses for the acquiring company post-merger. This poses a major risk to the success of the transaction.",
          "page_number": 4
        },
        {
          "clause_title": "Section 7.01. Conditions to the Obligations of Each Party",
          "clause_summary": "This section outlines conditions precedent to the merger, including stockholder approval, expiration of the HSR Act waiting period, and the absence of any injunctions. Failure to meet these conditions could prevent the merger from closing.",
          "risk_level": "CRITICAL",
          "risk_explanation": "The failure of any of these conditions could result in the termination of the merger agreement, potentially leading to significant financial losses and reputational damage for all parties involved.",
          "page_number": 6
        },
        {
          "clause_title": "Section 3.10. Litigation",
          "clause_summary": "The Company represents that there is no litigation that would materially adversely affect it. However, Schedule 3.10 lists pending litigation, requiring careful review of the details and potential outcomes.",
          "risk_level": "HIGH",
          "risk_explanation": "The pending litigation, as detailed in Schedule 3.10, presents a significant risk. Unfavorable outcomes could negatively impact the Company's financial position and the overall success of the merger.",
          "page_number": 4
        },
        {
          "clause_title": "Section 3.16. Intellectual Property",
          "clause_summary": "The Company warrants ownership or licensing of necessary intellectual property. Schedule 3.16 lists registered intellectual property, but unregistered IP and licensing agreements need thorough due diligence.",
          "risk_level": "HIGH",
          "risk_explanation": "Issues with intellectual property rights could lead to costly legal battles and operational disruptions after the merger. A comprehensive review of all IP assets is critical.",
          "page_number": 4
        },
        {
          "clause_title": "Section 8.01. Termination",
          "clause_summary": "This clause details circumstances under which the agreement can be terminated, including failure to close by a certain date, legal prohibitions, or a change in recommendation by the Company's board. These scenarios could lead to significant financial consequences.",
          "risk_level": "HIGH",
          "risk_explanation": "The various termination scenarios outlined pose significant risks, particularly the potential for a termination fee or loss of investment for the acquiring party. Careful negotiation and mitigation strategies are crucial.",
          "page_number": 7
        },
        {
          "clause_title": "Section 9.07. Waiver of Jury Trial",
          "clause_summary": "This clause mandates a waiver of the right to a jury trial for any legal proceedings related to the agreement. This significantly limits recourse for any party in case of disputes.",
          "risk_level": "HIGH",
          "risk_explanation": "By waiving the right to a jury trial, the parties are agreeing to have their disputes resolved by a judge, which may or may not be favorable to their interests. This limits the potential for a more favorable outcome compared to a jury trial.",
          "page_number": 7
        }
      ]
    }
    setClauseData(sampleData)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            <div className="flex items-center space-x-2">
              <Scale className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Legal AI Advisor
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* New Chat Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleNewChat}
                    className="mr-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    New Chat
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start a new chat session with a fresh document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Test Button - Remove this when backend is ready */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadSampleData}
              className="mr-2"
            >
              Load Sample Data
            </Button>

            {/* Summarize Button - Flashy and prominent */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    className="summarize-button text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 border-0"
                    disabled={isSummarizing || !selectedFile}
                    onClick={() => {
                      setIsSummarizing(true)
                      // TODO: Implement summarize functionality
                      console.log('Summarize document clicked')
                      // Simulate API call and load clause data
                      setTimeout(() => {
                        setIsSummarizing(false)
                        loadSampleData() // This simulates getting data from backend
                      }, 2000)
                    }}
                  >
                    {isSummarizing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Summarize Document
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Get an AI-powered summary of the entire document</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* User Info */}
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <User className="h-4 w-4" />
              <span>{user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
            </div>
            
            <ThemeToggle />
            
            {/* Logout Button */}
            <SignOutButton>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Clause Extraction */}
        <div className="w-80 border-r bg-white dark:bg-gray-900">
          <ClauseExtractionSidebar
            data={clauseData}
            onClauseClick={handleClauseClick}
            onGoToPage={handleGoToPage}
            isLoading={processingProgress < 100 && selectedFile !== null}
          />
        </div>

        {/* Middle Section - PDF Viewer (Full Area) */}
        <div className="flex-1 flex flex-col">
          {/* Document Upload Area - Compact */}
          {!selectedFile && (
            <div className="p-4 border-b bg-white dark:bg-gray-900">
              <DocumentUpload
                onFileSelect={handleFileSelect}
                selectedFile={selectedFile}
                onFileRemove={handleFileRemove}
              />
            </div>
          )}

          {/* PDF Viewer - Takes Full Remaining Space */}
          <div className="flex-1">
            <ReliablePDFViewer
              file={selectedFile}
              processingProgress={processingProgress}
              isSummarizing={isSummarizing}
              targetPage={targetPage}
              onSummarizePage={() => {
                setIsSummarizing(true)
                // TODO: Implement summarize page functionality
                console.log('Summarize current page clicked')
                // Simulate API call
                setTimeout(() => setIsSummarizing(false), 2000)
              }}
            />
          </div>
        </div>

        {/* Right Section - Chat Interface */}
        <div className="w-96 border-l">
          <ChatInterface onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}