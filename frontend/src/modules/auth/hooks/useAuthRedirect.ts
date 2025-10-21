import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ROUTES } from '@/app/router/consts'
import { useAuth } from './useAuth' // Relative import within the same module

interface UseAuthRedirectOptions {
  requireAuth?: boolean
  redirectTo?: string
}

export function useAuthRedirect({ requireAuth = true, redirectTo = '/login' }: UseAuthRedirectOptions = {}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading, initialized } = useAuth()

  useEffect(() => {
    if (!initialized || loading) return

    const isAuthenticated = !!user
    console.log('Auth redirect check:', { isAuthenticated, requireAuth, currentPath: location.pathname })
    
    if (requireAuth && !isAuthenticated) {
      console.log('Redirecting to login - auth required but not authenticated')
      navigate(redirectTo, { replace: true, state: { from: location } })
      return
    }
    
    if (!requireAuth && isAuthenticated) {
      if (location.pathname === ROUTES.LOGIN.path || location.pathname === ROUTES.SIGNUP.path) {
        console.log('Redirecting to dashboard - already authenticated')
        navigate(ROUTES.DASHBOARD.path, { replace: true })
      }
    }
  }, [user, loading, initialized, navigate, location, requireAuth, redirectTo])

  return { 
    loading,
    isAuthenticated: !!user,
    initialized 
  }
}