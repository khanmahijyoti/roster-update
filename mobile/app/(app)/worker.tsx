import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../context/session-context'
import {
  calculateHours,
  canEditAvailability,
  formatClock,
  formatDateISO,
  getCurrentWeek,
  getDatesInWeek,
  getNextWeek,
  getShortDayName,
  isAvailabilityLocked,
} from '../../lib/date-utils'
import { tokens } from '../../theme/tokens'
import { ui } from '../../theme/styles'

type AvailabilityRow = {
  id: string
  date: string
  can_work_morning: boolean
  can_work_afternoon: boolean
}

type ShiftRow = {
  id: string
  start_time: string
  end_time: string
  restaurant: { name: string } | { name: string }[] | null
}

export default function WorkerScreen() {
  const { session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasProfile, setHasProfile] = useState(true)
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [availability, setAvailability] = useState<Map<string, AvailabilityRow>>(new Map())

  const currentWeek = useMemo(() => getCurrentWeek(), [])
  const nextWeek = useMemo(() => getNextWeek(), [])
  const nextWeekDates = useMemo(() => getDatesInWeek(nextWeek), [nextWeek])
  const locked = isAvailabilityLocked()

  useEffect(() => {
    if (!session) {
      router.replace('/(auth)/login')
      return
    }
    loadData()
  }, [session?.user.id])

  async function loadData() {
    if (!session?.user.id) return
    try {
      setLoading(true)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) throw profileError

      if (!profile) {
        setHasProfile(false)
        setShifts([])
        setAvailability(new Map())
        return
      }

      setHasProfile(true)

      const { data: shiftData, error: shiftError } = await supabase
        .from('shifts')
        .select('id,start_time,end_time,restaurant:restaurants(name)')
        .eq('worker_id', session.user.id)
        .eq('status', 'published')
        .gte('start_time', currentWeek.start.toISOString())
        .lte('start_time', currentWeek.end.toISOString())
        .order('start_time')

      if (shiftError) throw shiftError
      setShifts((shiftData as unknown as ShiftRow[]) || [])

      const { data: availData, error: availError } = await supabase
        .from('availability')
        .select('id,date,can_work_morning,can_work_afternoon')
        .eq('user_id', session.user.id)
        .in(
          'date',
          nextWeekDates.map((d) => formatDateISO(d))
        )

      if (availError) throw availError

      const map = new Map<string, AvailabilityRow>()
      ;(availData || []).forEach((a) => map.set(a.date, a as AvailabilityRow))
      setAvailability(map)
    } catch (error) {
      console.error('Failed to load worker data:', error)
      Alert.alert('Error', 'Could not load your worker dashboard.')
    } finally {
      setLoading(false)
    }
  }

  function getPeriodAvailable(date: Date, period: 'morning' | 'afternoon') {
    const key = formatDateISO(date)
    const row = availability.get(key)
    if (!row) return true
    return period === 'morning' ? row.can_work_morning : row.can_work_afternoon
  }

  async function toggleAvailability(date: Date, period: 'morning' | 'afternoon') {
    if (!session?.user.id || !canEditAvailability(date) || !hasProfile) return
    const key = formatDateISO(date)
    const current = availability.get(key)

    setSaving(true)
    try {
      if (current) {
        const updates = {
          can_work_morning:
            period === 'morning' ? !current.can_work_morning : current.can_work_morning,
          can_work_afternoon:
            period === 'afternoon'
              ? !current.can_work_afternoon
              : current.can_work_afternoon,
        }

        const { error } = await supabase
          .from('availability')
          .update(updates)
          .eq('id', current.id)

        if (error) throw error
        const next = new Map(availability)
        next.set(key, { ...current, ...updates })
        setAvailability(next)
      } else {
        const payload = {
          user_id: session.user.id,
          date: key,
          can_work_morning: period === 'morning' ? false : true,
          can_work_afternoon: period === 'afternoon' ? false : true,
        }

        const { data, error } = await supabase
          .from('availability')
          .insert(payload)
          .select('id,date,can_work_morning,can_work_afternoon')
          .single()

        if (error) throw error
        const next = new Map(availability)
        next.set(key, data as AvailabilityRow)
        setAvailability(next)
      }
    } catch (error) {
      console.error('Failed to update availability:', error)
      Alert.alert('Error', 'Could not update availability. Your profile may not be provisioned yet.')
    } finally {
      setSaving(false)
    }
  }

  async function onSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.subtitle}>Loading worker dashboard...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Worker Dashboard</Text>
            <Text style={styles.subtitle}>{session?.user.email ?? 'Unknown'}</Text>
          </View>
          <Pressable onPress={onSignOut} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Week Shifts</Text>
          {shifts.length === 0 ? (
            <Text style={styles.muted}>No published shifts this week.</Text>
          ) : (
            shifts.map((shift) => (
              <View key={shift.id} style={styles.rowCard}>
                <Text style={styles.value}>
                  {new Date(shift.start_time).toLocaleDateString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </Text>
                <Text style={styles.muted}>
                  {Array.isArray(shift.restaurant)
                    ? shift.restaurant[0]?.name ?? 'Restaurant'
                    : shift.restaurant?.name ?? 'Restaurant'}
                </Text>
                <Text style={styles.value}>
                  {formatClock(shift.start_time)} - {formatClock(shift.end_time)} ({calculateHours(shift.start_time, shift.end_time).toFixed(1)}h)
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Next Week Availability</Text>
          {!hasProfile ? (
            <Text style={styles.locked}>Profile missing in database. Ask admin to run profile backfill.</Text>
          ) : null}
          {locked ? <Text style={styles.locked}>Locked after Saturday 23:00</Text> : null}

          {nextWeekDates.map((date) => {
            const canEdit = !locked && canEditAvailability(date)
            const morning = getPeriodAvailable(date, 'morning')
            const afternoon = getPeriodAvailable(date, 'afternoon')
            return (
              <View key={formatDateISO(date)} style={styles.dayBlock}>
                <Text style={styles.value}>
                  {getShortDayName(date)} {date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                </Text>
                <View style={styles.periodRow}>
                  <Pressable
                    disabled={!canEdit || saving || !hasProfile}
                    onPress={() => toggleAvailability(date, 'morning')}
                    style={[styles.periodBtn, morning ? styles.available : styles.unavailable]}
                  >
                    <Text style={styles.periodText}>Morning {morning ? 'Available' : 'Unavailable'}</Text>
                  </Pressable>
                  <Pressable
                    disabled={!canEdit || saving || !hasProfile}
                    onPress={() => toggleAvailability(date, 'afternoon')}
                    style={[styles.periodBtn, afternoon ? styles.available : styles.unavailable]}
                  >
                    <Text style={styles.periodText}>Afternoon {afternoon ? 'Available' : 'Unavailable'}</Text>
                  </Pressable>
                </View>
              </View>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.color.background },
  container: { padding: 16, gap: 12, paddingBottom: 28 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: tokens.color.foreground, fontSize: 26, fontWeight: '700' },
  subtitle: { color: tokens.color.mutedForeground, marginTop: 6 },
  signOutBtn: {
    backgroundColor: tokens.color.destructive,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signOutText: { color: tokens.color.destructiveForeground, fontWeight: '700' },
  card: {
    backgroundColor: tokens.color.card,
    borderColor: tokens.color.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: ui.sectionTitle,
  rowCard: {
    backgroundColor: tokens.color.secondary,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  value: { color: tokens.color.foreground, fontWeight: '600' },
  muted: { color: tokens.color.mutedForeground },
  locked: { color: tokens.color.destructive, fontWeight: '600' },
  dayBlock: {
    borderTopColor: tokens.color.border,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  available: { backgroundColor: tokens.color.primary },
  unavailable: { backgroundColor: tokens.color.destructive },
  periodText: { color: tokens.color.primaryForeground, fontSize: 12, fontWeight: '700' },
})
