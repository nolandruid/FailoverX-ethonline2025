import { useEffect } from 'react'
import { useAuthStore } from '../stores'
import * as authService from '../services'

export function useAuth() {
  const { user, loading, initialized, setUser, setLoading, setInitialized } = useAuthStore()
  
  useEffect(() => {
    const initializeAuth = async () => {
      if (initialized) return
      
      console.log('Initializing auth...')
      const { user, error } = await authService.getSession()
      
      if (error) {
        console.error('Error getting session:', error)
      }
      
      setUser(user)
      setLoading(false)
      setInitialized(true)
      
      const { data: { subscription } } = authService.onAuthStateChange(setUser)
      
      return () => subscription.unsubscribe()
    }
    
    initializeAuth()
  }, [initialized, setUser, setLoading, setInitialized])

  return { 
    user,
    loading,
    initialized,
    isAuthenticated: !!user
  }
}