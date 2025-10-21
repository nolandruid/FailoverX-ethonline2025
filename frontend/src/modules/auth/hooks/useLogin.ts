import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '../services'
import { ROUTES } from '@/app/router/consts'

export function useLogin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const login = async (email: string, password: string) => {
    setError('')
    setLoading(true)

    try {
      const { user, error: authError } = await authService.signIn(email, password)
      
      if (authError) {
        setError(authError.message)
        return { success: false, error: authError.message }
      }
      
      if (user) {
        navigate(ROUTES.DASHBOARD.path)
        return { success: true, user }
      }
      
      return { success: false, error: 'Unable to sign in' }
    } catch (err) {
      const errorMessage = 'Unexpected error during sign in'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError('')

  return {
    login,
    loading,
    error,
    clearError
  }
}