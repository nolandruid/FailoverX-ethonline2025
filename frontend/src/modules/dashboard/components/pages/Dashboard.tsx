import React from 'react'
import { useLogout } from '@/modules/auth/hooks'
import { Button } from '@/globals/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/globals/components/ui/card'
import { Alert, AlertDescription } from '@/globals/components/ui/alert'

export function Dashboard() {
  const { logout, loading, error, clearError } = useLogout()

  const handleLogout = async () => {
    clearError()
    await logout()
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button 
          onClick={handleLogout}
          variant="outline"
          disabled={loading}
        >
          {loading ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You have successfully signed in. This is your protected dashboard area.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
