import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as authService from '../services'
import { useAuthStore } from '../stores'
import { ROUTES } from '@/app/router/consts'

export function useLogout() {
  const navigate = useNavigate()
  const { reset } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const logout = async () => {
    setError('')
    setLoading(true)

    try {
      const { error: authError } = await authService.signOut()
      
      if (authError) {
        setError(authError.message)
        return { success: false, error: authError.message }
      }
      
      // Reset store state
      reset()
      
      // Redirect to login
      navigate(ROUTES.LOGIN.path, { replace: true })
      
      return { success: true }
    } catch (err) {
      const errorMessage = 'Unexpected error during logout'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }

  const clearError = () => setError('')

  return {
    logout,
    loading,
    error,
    clearError
  }
}