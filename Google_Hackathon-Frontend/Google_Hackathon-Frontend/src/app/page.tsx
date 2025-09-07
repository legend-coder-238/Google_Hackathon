"use client"

import { useAuth, useUser, SignOutButton } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuthenticatedAPI } from "@/lib/useAuthenticatedAPI"
import { Scale, FileText, MessageSquare, Shield, Zap, LogOut, User, RefreshCw, AlertCircle } from "lucide-react"
import { useEffect } from 'react'

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user } = useUser()
  const router = useRouter()
  const { isAPIAuthenticated, authError, isLoading, retryAuthentication } = useAuthenticatedAPI()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in')
    }
  }, [isSignedIn, isLoaded, router])

  if (!isLoaded || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Legal AI Advisor</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <User className="h-4 w-4" />
              <span>Welcome, {user?.firstName || user?.emailAddresses[0]?.emailAddress}</span>
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
      <main className="container mx-auto px-4 py-12">
        {/* Show API authentication error if present */}
        {authError && (
          <div className="mb-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>API Authentication failed: {authError}</span>
                  <Button 
                    onClick={retryAuthentication} 
                    variant="outline" 
                    size="sm"
                    className="ml-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Demystify Legal Documents with AI
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Transform complex legal jargon into clear, understandable guidance. 
            Upload your documents and get instant AI-powered analysis and explanations.
          </p>
          <Button 
            size="lg" 
            className="text-lg px-8 py-6 bg-blue-600 hover:bg-blue-700"
            onClick={() => router.push('/chat')}
            disabled={!isAPIAuthenticated}
          >
            <MessageSquare className="mr-2 h-5 w-5" />
            {isAPIAuthenticated ? 'Start Chat' : 'Authenticating...'}
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <FileText className="h-12 w-12 text-blue-600 mb-4" />
              <CardTitle>Document Analysis</CardTitle>
              <CardDescription>
                Upload PDFs and get comprehensive analysis of terms, clauses, and potential risks
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <Zap className="h-12 w-12 text-green-600 mb-4" />
              <CardTitle>Instant Explanations</CardTitle>
              <CardDescription>
                Get real-time explanations of complex legal language in simple, understandable terms
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <CardHeader>
              <Shield className="h-12 w-12 text-purple-600 mb-4" />
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>
                Identify potential risks and unfavorable terms before you sign any document
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Use Cases */}
        <div className="text-center">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Perfect for Various Legal Documents
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              "Rental Agreements",
              "Loan Contracts", 
              "Terms of Service",
              "Employment Contracts",
              "Insurance Policies",
              "Purchase Agreements",
              "Privacy Policies",
              "Service Contracts"
            ].map((item) => (
              <Card key={item} className="p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
                <CardContent className="p-0">
                  <p className="font-medium text-gray-900 dark:text-white">{item}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}