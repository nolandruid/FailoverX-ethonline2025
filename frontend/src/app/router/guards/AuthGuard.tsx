import { Outlet } from 'react-router-dom'

import { Card, CardContent, CardHeader } from '@/globals/components/ui/card'
import { Skeleton } from '@/globals/components/ui/skeleton'
import { useAuthRedirect } from '@/modules/auth/hooks'

interface AuthGuardProps {
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ requireAuth = true, redirectTo = '/login' }: AuthGuardProps) {
  const { loading } = useAuthRedirect({ requireAuth, redirectTo })

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-2/3 mx-auto" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return <Outlet />
}