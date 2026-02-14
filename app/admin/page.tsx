'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Restaurant, Shift } from '@/types/database'
import { RosterGrid } from '@/components/roster/RosterGrid'
import { RosterActions } from '@/components/roster/RosterActions'
import { RestaurantManager } from '@/components/admin/RestaurantManager'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { getCurrentWeek, getNextWeek } from '@/utils/date-utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdminPage() {
  const { user, profile, role, restaurantId, setSelectedRestaurant, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurantLocal] = useState<string | null>(restaurantId)
  const [loading, setLoading] = useState(true)
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showRestaurantManager, setShowRestaurantManager] = useState(false)
  const [workerCount, setWorkerCount] = useState(0)

  const currentWeek = getCurrentWeek()
  const nextWeek = getNextWeek()
  const activeWeek = selectedWeek === 'current' ? currentWeek : nextWeek

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/auth/login')
      } else if (role !== 'super_admin') {
        router.push('/worker')
      } else {
        loadRestaurants()
      }
    }
  }, [user, role, authLoading])

  useEffect(() => {
    if (selectedRestaurant) {
      loadShifts()
    }
  }, [selectedRestaurant, selectedWeek, refreshKey])

  useEffect(() => {
    loadWorkerCount()
  }, [refreshKey])

  async function loadRestaurants() {
    if (!user) return

    try {
      // Super admin can see ALL restaurants
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .order('name')

      if (restaurantsError) throw restaurantsError
      setRestaurants((restaurants || []) as Restaurant[])

      // Auto-select first restaurant if none selected
      if (!selectedRestaurant && restaurants && restaurants.length > 0) {
        setSelectedRestaurantLocal((restaurants[0] as any).id)
        setSelectedRestaurant((restaurants[0] as any).id)
      }
    } catch (error) {
      console.error('Error loading restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleRestaurantChange(restaurantId: string) {
    setSelectedRestaurantLocal(restaurantId)
    setSelectedRestaurant(restaurantId)
  }

  async function loadShifts() {
    if (!selectedRestaurant) return

    try {
      // Create end of week timestamp (Sunday 23:59:59)
      const weekEndTimestamp = new Date(activeWeek.end);
      weekEndTimestamp.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('restaurant_id', selectedRestaurant)
        .gte('start_time', activeWeek.start.toISOString())
        .lte('start_time', weekEndTimestamp.toISOString())

      if (error) throw error
      setShifts((data || []) as Shift[])
    } catch (error) {
      console.error('Error loading shifts:', error)
    }
  }

  async function loadWorkerCount() {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'worker')

      if (error) throw error
      setWorkerCount(count || 0)
    } catch (error) {
      console.error('Error loading worker count:', error)
    }
  }

  function handleShiftsChange() {
    setRefreshKey((prev) => prev + 1)
  }

  const draftCount = shifts.filter((s) => s.status === 'draft').length
  const publishedCount = shifts.filter((s) => s.status === 'published').length
  
  // Calculate total hours for the week
  const totalHours = shifts.reduce((total, shift) => {
    const start = new Date(shift.start_time)
    const end = new Date(shift.end_time)
    const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    return total + hours
  }, 0)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.first_name} {profile?.last_name}</p>
            </div>
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
          </div>
          
          <RestaurantManager 
            restaurants={restaurants} 
            onRestaurantsChange={loadRestaurants}
          />
        </div>
      </div>
    )
  }

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurant)

  // If showing restaurant manager, render that view
  if (showRestaurantManager) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Restaurant Management</h1>
              <p className="text-sm text-muted-foreground">Welcome, {profile?.first_name} {profile?.last_name}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRestaurantManager(false)}>
                Back to Roster
              </Button>
              <Button variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </div>
          </div>
          
          <RestaurantManager 
            restaurants={restaurants} 
            onRestaurantsChange={loadRestaurants}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Welcome back, {profile?.first_name} {profile?.last_name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => router.push('/reports')} 
              className="shadow-sm flex-1 sm:flex-none whitespace-nowrap text-sm sm:text-base"
            >
              View Reports
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowRestaurantManager(true)} 
              className="shadow-sm flex-1 sm:flex-none whitespace-nowrap text-sm sm:text-base"
            >
              Manage Restaurants
            </Button>
            <Button 
              variant="outline" 
              onClick={signOut} 
              className="shadow-sm flex-1 sm:flex-none text-sm sm:text-base"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Restaurant Selector */}
        <Card className="shadow-md border-0">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-lg">Select Restaurant</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <select
              value={selectedRestaurant || ''}
              onChange={(e) => handleRestaurantChange(e.target.value)}
              className="w-full p-3 border-2 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition-all bg-background"
            >
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Week Selector */}
        <Card className="shadow-md border-0">
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-lg">Week Selection</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant={selectedWeek === 'current' ? 'default' : 'outline'}
                onClick={() => setSelectedWeek('current')}
                className={`h-auto py-4 ${selectedWeek === 'current' ? 'shadow-lg' : ''}`}
              >
                <div className="text-center">
                  <div className="font-semibold">Current Week</div>
                  <div className="text-xs mt-1 opacity-90">
                    {currentWeek.start.toLocaleDateString()} - {currentWeek.end.toLocaleDateString()}
                  </div>
                </div>
              </Button>
              <Button
                variant={selectedWeek === 'next' ? 'default' : 'outline'}
                onClick={() => setSelectedWeek('next')}
                className={`h-auto py-4 ${selectedWeek === 'next' ? 'shadow-lg' : ''}`}
              >
                <div className="text-center">
                  <div className="font-semibold">Next Week</div>
                  <div className="text-xs mt-1 opacity-90">
                    {nextWeek.start.toLocaleDateString()} - {nextWeek.end.toLocaleDateString()}
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Stats */}
        {selectedRestaurant && (
          <DashboardStats
            totalWorkers={workerCount}
            draftShifts={draftCount}
            publishedShifts={publishedCount}
            totalHours={totalHours}
          />
        )}

        {/* Roster Actions */}
        {selectedRestaurant && (
          <RosterActions
            restaurantId={selectedRestaurant}
            weekStart={activeWeek.start}
            weekEnd={activeWeek.end}
            draftCount={draftCount}
            publishedCount={publishedCount}
            onPublishComplete={handleShiftsChange}
          />
        )}

        {/* Roster Grid */}
        {selectedRestaurant && (
          <Card className="shadow-lg border-0">
            <CardHeader className="bg-muted/50 border-b">
              <CardTitle className="text-xl">Roster Builder</CardTitle>
              <CardDescription className="text-base">
                Click on a cell to add a shift. 🟢 Available • 🔴 Unavailable (blocked)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <RosterGrid
                week={activeWeek}
                restaurantId={selectedRestaurant}
                onShiftsChange={handleShiftsChange}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
