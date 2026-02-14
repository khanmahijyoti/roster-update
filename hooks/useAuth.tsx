'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Profile, UserRole } from '@/types/database'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  role: UserRole | null
  restaurantId: string | null
  loading: boolean
  signOut: () => Promise<void>
  setSelectedRestaurant: (id: string) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadUserProfile(session.user.id)
      } else {
        setProfile(null)
        setRole(null)
        setRestaurantId(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadUserProfile(userId: string) {
    try {
      // Get profile (role is now on the profile directly)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) throw profileError
      
      setProfile(profileData)
      setRole(profileData.role) // Role comes from profile now
      
      // For super_admin, no specific restaurant needed (they manage all)
      // For workers, we could fetch their first assigned restaurant
      if (profileData.role === 'worker') {
        const { data: assignmentData } = await supabase
          .from('worker_assignments')
          .select('restaurant_id')
          .eq('worker_id', userId)
          .limit(1)
          .single()
        
        if (assignmentData) {
          setRestaurantId(assignmentData.restaurant_id)
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setRole(null)
    setRestaurantId(null)
    // Redirect to login page immediately
    router.push('/auth/login')
  }

  function setSelectedRestaurant(id: string) {
    setRestaurantId(id)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        restaurantId,
        loading,
        signOut,
        setSelectedRestaurant,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
