import React from 'react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { cn } from '@/lib/utils'

interface PhoneInputComponentProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
  error?: boolean
}

export function PhoneInputComponent({
  value,
  onChange,
  className,
  placeholder = "Enter phone number",
  disabled = false,
  error = false
}: PhoneInputComponentProps) {
  return (
    <div className={cn("phone-input-wrapper", className)}>
      <PhoneInput
        country={'us'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        inputClass={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500"
        )}
      />
    </div>
  )
}