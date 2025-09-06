"use client"

import { useAuth, useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { apiClient } from './api'

export function useAuthenticatedAPI() {
  const { isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [isAPIAuthenticated, setIsAPIAuthenticated] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const authenticateAPI = async () => {
      if (!isSignedIn || !user) {
        setIsAPIAuthenticated(false)
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setAuthError(null)
        
        await apiClient.authenticateWithClerk(user, getToken)
        
        if (isMounted) {
          setIsAPIAuthenticated(true)
          setAuthError(null)
        }
      } catch (error) {
        console.error('API authentication failed:', error)
        if (isMounted) {
          setIsAPIAuthenticated(false)
          setAuthError(error instanceof Error ? error.message : 'Authentication failed')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    authenticateAPI()

    return () => {
      isMounted = false
    }
  }, [isSignedIn, user, getToken])

  // Clear tokens when user signs out
  useEffect(() => {
    if (!isSignedIn) {
      apiClient.clearAuthToken()
      setIsAPIAuthenticated(false)
      setAuthError(null)
    }
  }, [isSignedIn])

  const retryAuthentication = async () => {
    if (!isSignedIn || !user) return

    try {
      setIsLoading(true)
      setAuthError(null)
      
      await apiClient.authenticateWithClerk(user, getToken)
      setIsAPIAuthenticated(true)
    } catch (error) {
      console.error('Retry authentication failed:', error)
      setAuthError(error instanceof Error ? error.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isAPIAuthenticated,
    authError,
    isLoading,
    retryAuthentication,
    user,
    isSignedIn
  }
}