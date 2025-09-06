"use client"

import { useState } from 'react'
import { PhoneAuth } from '@/components/phone-auth'
import { useRouter } from 'next/navigation'

export default function PhoneAuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const router = useRouter()

  const handleAuthSuccess = (userData: any) => {
    // Store user data and redirect
    console.log('Authentication successful:', userData)
    
    // Redirect to chat page or dashboard
    router.push('/chat')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Legal AI Advisor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Secure phone authentication
          </p>
        </div>
        
        <PhoneAuth 
          mode={mode}
          onSuccess={handleAuthSuccess}
          onModeChange={setMode}
        />
      </div>
    </div>
  )
}