'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CardContainer, CardBody, CardItem } from '@/components/ui/3d-card'
import { motion } from 'framer-motion'
import { 
  getCurrentWeek, 
  getNextWeek, 
  getDatesInWeek, 
  getShortDayName, 
  formatDateISO,
  canEditAvailability,
  isAvailabilityLocked
} from '@/utils/date-utils'
import { Availability } from '@/types/database'

export default function WorkerPage() {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const supabase = createClient()
  
  const [currentWeekShifts, setCurrentWeekShifts] = useState<any[]>([])
  const [nextWeekAvailability, setNextWeekAvailability] = useState<Map<string, Availability>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const currentWeek = getCurrentWeek()
  const nextWeek = getNextWeek()

  useEffect(() => {
    if (!authLoading && user) {
      loadData()
      setIsLocked(isAvailabilityLocked())
    }
  }, [user, authLoading])

  async function loadData() {
    if (!user) return

    try {
      // Load current week published shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select('*, restaurant:restaurants(name)')
        .eq('worker_id', user.id)
        .eq('status', 'published')
        .gte('start_time', currentWeek.start.toISOString())
        .lte('start_time', currentWeek.end.toISOString())
        .order('start_time')

      if (shiftsError) throw shiftsError
      setCurrentWeekShifts(shifts || [])

      // Load next week availability
      const nextWeekDates = getDatesInWeek(nextWeek)
      const { data: availability, error: availError } = await supabase
        .from('availability')
        .select('*')
        .eq('user_id', user.id)
        .in('date', nextWeekDates.map(d => formatDateISO(d)))

      if (availError) throw availError

      // Convert to Map for easy lookup
      const availMap = new Map<string, Availability>()
      availability?.forEach((a: any) => availMap.set(a.date, a as Availability))
      setNextWeekAvailability(availMap)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function toggleAvailability(date: Date, period: 'morning' | 'afternoon') {
    if (!user || !canEditAvailability(date)) return

    const dateStr = formatDateISO(date)
    const existing = nextWeekAvailability.get(dateStr)

    setSaving(true)
    try {
      if (existing) {
        // Update existing record
        const updates = {
          can_work_morning: period === 'morning' ? !existing.can_work_morning : existing.can_work_morning,
          can_work_afternoon: period === 'afternoon' ? !existing.can_work_afternoon : existing.can_work_afternoon,
        }

        // @ts-ignore - Supabase generated types issue
        const { error } = await supabase
          .from('availability')
          .update(updates)
          .eq('id', existing.id)

        if (error) throw error

        // Update local state
        const updated = { ...existing, ...updates }
        const newMap = new Map(nextWeekAvailability)
        newMap.set(dateStr, updated)
        setNextWeekAvailability(newMap)
      } else {
        // Create new record (default is true, so we're marking unavailable)
        const newRecord = {
          user_id: user.id,
          date: dateStr,
          can_work_morning: period === 'morning' ? false : true,
          can_work_afternoon: period === 'afternoon' ? false : true,
        }

        const { data, error } = await supabase
          .from('availability')
          .insert(newRecord)
          .select()
          .single()

        if (error) throw error

        // Update local state
        const newMap = new Map(nextWeekAvailability)
        newMap.set(dateStr, data)
        setNextWeekAvailability(newMap)
      }
    } catch (error) {
      console.error('Error updating availability:', error)
      alert('Failed to update availability')
    } finally {
      setSaving(false)
    }
  }

  function getAvailabilityStatus(date: Date, period: 'morning' | 'afternoon'): boolean {
    const dateStr = formatDateISO(date)
    const avail = nextWeekAvailability.get(dateStr)
    
    // No record = available (default)
    if (!avail) return true
    
    return period === 'morning' ? avail.can_work_morning : avail.can_work_afternoon
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const currentWeekDates = getDatesInWeek(currentWeek)
  const nextWeekDates = getDatesInWeek(nextWeek)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              Welcome, {profile?.first_name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">Worker Dashboard</p>
          </div>
          <Button variant="outline" onClick={signOut} className="shadow-sm text-sm sm:text-base">
            Sign Out
          </Button>
        </div>

        {/* Current Week - Read Only */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="h-2 bg-primary" />
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-xl">Current Week Shifts</CardTitle>
            <CardDescription className="text-base">
              {currentWeek.start.toLocaleDateString()} - {currentWeek.end.toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {currentWeekShifts.length === 0 ? (
              <div className="text-center py-12">
                <motion.div 
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                >
                  <span className="text-3xl">📅</span>
                </motion.div>
                <p className="text-muted-foreground">No shifts assigned this week</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {currentWeekShifts.map((shift, index) => (
                  <motion.div
                    key={shift.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <div className="relative p-6 bg-muted/30 rounded-2xl border-2 border-primary/20 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <motion.p 
                            className="font-bold text-2xl text-primary"
                            whileHover={{ scale: 1.05 }}
                          >
                            {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </motion.p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="inline-block w-3 h-3 rounded-full bg-primary animate-pulse"></span>
                            <p className="text-sm font-medium text-muted-foreground">{shift.restaurant?.name}</p>
                          </div>
                        </div>
                        <div className="text-right bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-primary/20">
                          <p className="font-bold text-xl text-primary">
                            {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })}
                            {' - '}
                            {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 font-semibold">
                            {((new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60)).toFixed(1)}h
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Week - Editable */}
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="h-2 bg-primary" />
          <CardHeader className="bg-muted/50">
            <CardTitle className="text-xl">Next Week Availability</CardTitle>
            <CardDescription className="text-base">
              {nextWeek.start.toLocaleDateString()} - {nextWeek.end.toLocaleDateString()}
              {isLocked && (
                <span className="block text-destructive mt-2 font-semibold">
                  🔒 Locked - Editing closes Saturday at 23:00
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {nextWeekDates.map((date) => {
                const morningAvail = getAvailabilityStatus(date, 'morning')
                const afternoonAvail = getAvailabilityStatus(date, 'afternoon')
                const canEdit = !isLocked && canEditAvailability(date)

                return (
                  <motion.div 
                    key={formatDateISO(date)} 
                    className="border-2 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: date.getDay() * 0.05 }}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <p className="font-bold text-lg">{getShortDayName(date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        onClick={() => toggleAvailability(date, 'morning')}
                        disabled={!canEdit || saving}
                        className={`p-4 rounded-xl text-sm font-semibold transition-all relative overflow-hidden ${
                          morningAvail
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md'
                            : 'bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-md'
                        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                        whileHover={canEdit ? { scale: 1.05 } : {}}
                        whileTap={canEdit ? { scale: 0.95 } : {}}
                      >
                        <div className="relative z-10">
                          <div className="text-base mb-1">Morning</div>
                          <div className="text-xs opacity-90">08:00 - 14:00</div>
                          <div className="mt-2 text-sm">{morningAvail ? '✓ Available' : '✗ Unavailable'}</div>
                        </div>
                        <motion.div 
                          className="absolute inset-0 bg-white/20"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                        />
                      </motion.button>
                      <motion.button
                        onClick={() => toggleAvailability(date, 'afternoon')}
                        disabled={!canEdit || saving}
                        className={`p-4 rounded-xl text-sm font-semibold transition-all relative overflow-hidden ${
                          afternoonAvail
                            ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-md'
                            : 'bg-gradient-to-br from-red-500 to-pink-500 text-white shadow-md'
                        } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
                        whileHover={canEdit ? { scale: 1.05 } : {}}
                        whileTap={canEdit ? { scale: 0.95 } : {}}
                      >
                        <div className="relative z-10">
                          <div className="text-base mb-1">Afternoon</div>
                          <div className="text-xs opacity-90">14:00 - 23:00</div>
                          <div className="mt-2 text-sm">{afternoonAvail ? '✓ Available' : '✗ Unavailable'}</div>
                        </div>
                        <motion.div 
                          className="absolute inset-0 bg-white/20"
                          initial={{ x: '-100%' }}
                          whileHover={{ x: '100%' }}
                          transition={{ duration: 0.5 }}
                        />
                      </motion.button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
            {!isLocked && (
              <div className="mt-6 p-4 bg-muted/50 rounded-xl border-2 border-primary/20">
                <p className="text-sm text-center text-muted-foreground">
                  💡 Tap a period to toggle availability. Changes are saved automatically.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
