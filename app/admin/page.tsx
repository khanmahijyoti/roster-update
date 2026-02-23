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
import { SidePanel } from '@/components/ui/side-panel'
import { getCurrentWeek, getNextWeek } from '@/utils/date-utils'
import { ChevronLeft, ChevronRight, BarChart3, Settings, FileText, LogOut, LayoutGrid, Calendar } from 'lucide-react'

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
  const [workerCount, setWorkerCount] = useState(0)
  
  // Panel states
  const [showStats, setShowStats] = useState(false)
  const [showManagement, setShowManagement] = useState(false)

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
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">No Restaurants Found</h1>
          <p className="text-muted-foreground">Please create a restaurant to get started.</p>
          <Button onClick={() => setShowManagement(true)}>Open Management Panel</Button>
          
          <SidePanel 
            isOpen={showManagement} 
            onClose={() => setShowManagement(false)} 
            title="Restaurant Management"
            width="max-w-4xl"
          >
            <RestaurantManager 
              restaurants={restaurants} 
              onRestaurantsChange={loadRestaurants}
            />
          </SidePanel>
        </div>
      </div>
    )
  }

  const currentRestaurant = restaurants.find(r => r.id === selectedRestaurant)

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground truncate">
                {currentRestaurant?.name || 'Select Restaurant'}
              </p>
            </div>
          </div>

          {/* Center: Controls */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 justify-center max-w-2xl">
            {/* Restaurant Selector */}
            <select
              value={selectedRestaurant || ''}
              onChange={(e) => handleRestaurantChange(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 w-full sm:w-48"
            >
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>

            {/* Week Toggle */}
            <div className="flex bg-muted rounded-lg p-1 shrink-0">
              <button
                onClick={() => setSelectedWeek('current')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  selectedWeek === 'current' 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Current
              </button>
              <button
                onClick={() => setSelectedWeek('next')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${
                  selectedWeek === 'next' 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Next
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowStats(true)}
              title="Statistics"
              className="text-muted-foreground hover:text-primary"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.push('/reports')}
              title="Reports"
              className="text-muted-foreground hover:text-primary"
            >
              <FileText className="h-5 w-5" />
            </Button>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowManagement(true)}
              title="Manage Restaurants"
              className="text-muted-foreground hover:text-primary"
            >
              <Settings className="h-5 w-5" />
            </Button>

            <div className="h-6 w-px bg-border mx-1" />

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={signOut}
              title="Sign Out"
              className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content: Roster Grid */}
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-[1600px] mx-auto space-y-4">
          {selectedRestaurant && (
            <>
              {/* Roster Header */}
              <div className="flex flex-col gap-4 bg-card rounded-xl p-4 shadow-sm border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="truncate">{selectedWeek === 'current' ? 'Current Week Roster' : 'Next Week Plan'}</span>
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activeWeek.start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} - {activeWeek.end.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
                
                <RosterActions
                  restaurantId={selectedRestaurant}
                  weekStart={activeWeek.start}
                  weekEnd={activeWeek.end}
                  draftCount={draftCount}
                  publishedCount={publishedCount}
                  onPublishComplete={handleShiftsChange}
                />
              </div>

              {/* Roster Grid */}
              <Card className="shadow-lg border-0 overflow-hidden">
                <CardContent className="p-0">
                  <RosterGrid
                    week={activeWeek}
                    restaurantId={selectedRestaurant}
                    onShiftsChange={handleShiftsChange}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      {/* Side Panels */}
      
      {/* Statistics Panel */}
      <SidePanel 
        isOpen={showStats} 
        onClose={() => setShowStats(false)} 
        title="Dashboard Statistics"
        width="max-w-md"
      >
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Global system overview
          </p>
          <DashboardStats
            totalWorkers={workerCount}
            totalRestaurants={restaurants.length}
          />
        </div>
      </SidePanel>

      {/* Management Panel */}
      <SidePanel 
        isOpen={showManagement} 
        onClose={() => setShowManagement(false)} 
        title="Restaurant Management"
        width="max-w-4xl"
      >
        <RestaurantManager 
          restaurants={restaurants} 
          onRestaurantsChange={loadRestaurants}
        />
      </SidePanel>
    </div>
  )
}
