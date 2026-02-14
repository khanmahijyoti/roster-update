'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DebugPage() {
  const { user, profile, role, loading } = useAuth()
  const [dbRole, setDbRole] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function checkRole() {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching role:', error)
        } else {
          setDbRole(data?.role || null)
        }
      }
    }
    checkRole()
  }, [user])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Auth Context (useAuth hook)</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify({ user: user?.email, profile, role }, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Direct DB Query</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm">
                Role from database: {dbRole || 'null'}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Expected Behavior</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Role should be: <code className="bg-gray-200 px-2 py-1 rounded">super_admin</code></li>
                <li>Should redirect to: <code className="bg-gray-200 px-2 py-1 rounded">/admin</code></li>
                <li>Current page: <code className="bg-gray-200 px-2 py-1 rounded">{typeof window !== 'undefined' ? window.location.pathname : '?'}</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
