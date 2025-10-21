import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '../services'
import { ROUTES } from '@/app/router/consts'

export function useSignUp() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const signUp = async (email: string, password: string) => {
    setError('')
    setLoading(true)

    try {
      const { user, error: authError } = await authService.signUp(email, password)
      
      if (authError) {
        setError(authError.message)
        return { success: false, error: authError.message }
      }
      
      if (user) {
        navigate(ROUTES.LOGIN.path, { 
          state: { message: 'Account created. Please check your email to confirm.' }
        })
        return { success: true, user }
      }
      
      return { success: false, error: 'Unable to create account' }
    } catch (err) {
      const errorMessage = 'Unexpected error creating account'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError('')

  return {
    signUp,
    loading,
    error,
    clearError
  }
}