import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Roster Management System
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Centralized workforce management for hospitality
        </p>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <p className="text-gray-700 mb-6">
            Workers: Manage availability and view shifts<br/>
            Admin: Build rosters for all restaurants
          </p>
          
          <div className="space-y-4">
            <Link href="/auth/login">
              <Button className="w-full" size="lg">
                Sign In
              </Button>
            </Link>
            
            <Link href="/auth/signup">
              <Button className="w-full" variant="outline" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
          
          <p className="text-xs text-gray-500 mt-6">
            New accounts are workers by default.<br/>
            Contact admin for super admin access.
          </p>
        </div>
      </div>
    </div>
  );
}
