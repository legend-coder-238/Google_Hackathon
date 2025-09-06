"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PhoneInputComponent } from "@/components/ui/phone-input"
import { apiClient, handleApiError } from '@/lib/api'
import { AlertCircle, CheckCircle, Phone, MessageSquare } from 'lucide-react'

interface PhoneAuthProps {
  mode: 'login' | 'register'
  onSuccess: (userData: any) => void
  onModeChange?: (mode: 'login' | 'register') => void
}

export function PhoneAuth({ mode, onSuccess, onModeChange }: PhoneAuthProps) {
  const [step, setStep] = useState<'phone' | 'otp' | 'details'>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleSendOTP = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const purpose = mode === 'register' ? 'registration' : 'login'
      const response = await apiClient.sendOTP(phone, purpose)
      
      if (response.success) {
        setSuccessMessage(`OTP sent to ${phone}`)
        setStep('otp')
        
        // In development, show the OTP
        if (response.data?.otp) {
          setSuccessMessage(`OTP sent to ${phone}. Development OTP: ${response.data.otp}`)
        }
      } else {
        setError(response.message || 'Failed to send OTP')
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        // Login with phone and OTP
        const response = await apiClient.loginWithPhone(phone, otp)
        
        if (response.success && response.data) {
          setSuccessMessage('Login successful!')
          onSuccess(response.data)
        } else {
          setError(response.message || 'Login failed')
        }
      } else {
        // For registration, verify OTP first then go to details step
        const response = await apiClient.verifyOTP(phone, otp)
        
        if (response.success) {
          setSuccessMessage('Phone verified! Please complete your registration.')
          setStep('details')
        } else {
          setError(response.message || 'OTP verification failed')
        }
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.registerWithPhone(phone, name, email, password, otp)
      
      if (response.success && response.data) {
        setSuccessMessage('Registration successful!')
        onSuccess(response.data)
      } else {
        setError(response.message || 'Registration failed')
      }
    } catch (error) {
      setError(handleApiError(error))
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setStep('phone')
    setPhone('')
    setOtp('')
    setName('')
    setEmail('')
    setPassword('')
    setError(null)
    setSuccessMessage(null)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Phone className="h-5 w-5" />
          {mode === 'login' ? 'Login with Phone' : 'Register with Phone'}
        </CardTitle>
        <CardDescription>
          {step === 'phone' && `Enter your phone number to ${mode === 'login' ? 'login' : 'register'}`}
          {step === 'otp' && 'Enter the verification code sent to your phone'}
          {step === 'details' && 'Complete your registration details'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
          </div>
        )}

        {step === 'phone' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number</label>
              <PhoneInputComponent
                value={phone}
                onChange={setPhone}
                placeholder="Enter your phone number"
                error={!!error}
              />
            </div>
            
            <Button 
              onClick={handleSendOTP} 
              disabled={isLoading || !phone}
              className="w-full"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-lg tracking-widest"
              />
            </div>
            
            <Button 
              onClick={handleVerifyOTP} 
              disabled={isLoading || otp.length !== 6}
              className="w-full"
            >
              {isLoading ? 'Verifying...' : mode === 'login' ? 'Login' : 'Verify'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetForm}
              className="w-full"
            >
              Change Phone Number
            </Button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <Button 
              onClick={handleRegister} 
              disabled={isLoading || !name || !email || !password}
              className="w-full"
            >
              {isLoading ? 'Creating Account...' : 'Complete Registration'}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={resetForm}
              className="w-full"
            >
              Start Over
            </Button>
          </div>
        )}
        
        {onModeChange && step === 'phone' && (
          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? "Don't have an account? Register" : "Already have an account? Login"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}