import { useEffect, useMemo, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { formatDateISO, getDatesInWeek, getWeekFromRange } from '../../lib/week-helpers'
import { tokens } from '../../theme/tokens'
import { ui } from '../../theme/styles'

type RestaurantRow = { id: string; name: string }
type WorkerRow = { id: string; first_name: string; last_name: string }
type ShiftRow = {
  id: string
  worker_id: string
  start_time: string
  end_time: string
}

type ArchivedWeek = {
  weekStart: Date
  weekEnd: Date
  label: string
}

export default function ArchiveScreen() {
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [weeks, setWeeks] = useState<ArchivedWeek[]>([])
  const [weekIndex, setWeekIndex] = useState(0)
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [shifts, setShifts] = useState<ShiftRow[]>([])

  useEffect(() => {
    loadBaseData()
  }, [])

  useEffect(() => {
    if (selectedRestaurant && weeks.length > 0) {
      loadArchivedData()
    }
  }, [selectedRestaurant, weekIndex])

  async function loadBaseData() {
    try {
      setLoading(true)
      const { data: restData, error: restErr } = await supabase
        .from('restaurants')
        .select('id,name')
        .order('name')
      if (restErr) throw restErr
      const rs = (restData || []) as RestaurantRow[]
      setRestaurants(rs)
      if (rs.length > 0) setSelectedRestaurant(rs[0].id)

      const { data: earliest, error: earliestErr } = await supabase
        .from('shifts')
        .select('start_time')
        .order('start_time', { ascending: true })
        .limit(1)
      if (earliestErr) throw earliestErr

      const start = earliest?.[0]?.start_time ? new Date(earliest[0].start_time) : new Date()
      const now = new Date()
      const generated = getWeekFromRange(start, now)
      setWeeks(generated)
      setWeekIndex(0)
    } catch (error) {
      console.error('Failed to load archive base data:', error)
      Alert.alert('Error', 'Could not load archive data.')
    } finally {
      setLoading(false)
    }
  }

  async function loadArchivedData() {
    const selectedWeek = weeks[weekIndex]
    if (!selectedWeek) return

    try {
      setLoading(true)
      const { data: workerData, error: workerErr } = await supabase
        .from('profiles')
        .select('id,first_name,last_name')
        .eq('role', 'worker')
        .order('first_name')
      if (workerErr) throw workerErr
      setWorkers((workerData || []) as WorkerRow[])

      const weekEnd = new Date(selectedWeek.weekEnd)
      weekEnd.setHours(23, 59, 59, 999)
      const { data: shiftData, error: shiftErr } = await supabase
        .from('shifts')
        .select('id,worker_id,start_time,end_time')
        .eq('restaurant_id', selectedRestaurant)
        .gte('start_time', selectedWeek.weekStart.toISOString())
        .lte('start_time', weekEnd.toISOString())
        .order('start_time')
      if (shiftErr) throw shiftErr
      setShifts((shiftData || []) as ShiftRow[])
    } catch (error) {
      console.error('Failed to load archived roster:', error)
      Alert.alert('Error', 'Could not load selected week.')
    } finally {
      setLoading(false)
    }
  }

  const selectedWeek = weeks[weekIndex]
  const weekDates = useMemo(
    () => (selectedWeek ? getDatesInWeek({ start: selectedWeek.weekStart, end: selectedWeek.weekEnd }) : []),
    [selectedWeek]
  )

  function getCellShifts(workerId: string, date: Date) {
    const key = formatDateISO(date)
    return shifts.filter((s) => s.worker_id === workerId && formatDateISO(new Date(s.start_time)) === key)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} horizontal>
        <View style={{ width: 980 }}>
          <Text style={styles.title}>Roster Archive</Text>
          <Text style={styles.subtitle}>Past week snapshots by restaurant</Text>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Restaurant</Text>
            <View style={styles.row}>
              {restaurants.map((r) => (
                <Pressable
                  key={r.id}
                  onPress={() => setSelectedRestaurant(r.id)}
                  style={[styles.chip, selectedRestaurant === r.id ? styles.chipOn : null]}
                >
                  <Text style={styles.chipText}>{r.name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Week</Text>
            <View style={styles.row}>
              <Pressable
                onPress={() => setWeekIndex((v) => Math.max(0, v - 1))}
                style={styles.chip}
                disabled={weekIndex <= 0}
              >
                <Text style={styles.chipText}>Prev</Text>
              </Pressable>
              <Text style={styles.value}>{selectedWeek?.label ?? 'No week'}</Text>
              <Pressable
                onPress={() => setWeekIndex((v) => Math.min(weeks.length - 1, v + 1))}
                style={styles.chip}
                disabled={weekIndex >= weeks.length - 1}
              >
                <Text style={styles.chipText}>Next</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Archived Grid</Text>
            {loading ? <Text style={styles.muted}>Loading...</Text> : null}
            <View style={styles.gridHeader}>
              <Text style={[styles.gridCell, styles.workerCol]}>Worker</Text>
              {weekDates.map((d: Date) => (
                <Text key={formatDateISO(d)} style={styles.gridCell}>
                  {d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })}
                </Text>
              ))}
            </View>

            {workers.map((w) => (
              <View key={w.id} style={styles.gridRow}>
                <Text style={[styles.gridCell, styles.workerCol]}>
                  {w.first_name} {w.last_name}
                </Text>
                {weekDates.map((d: Date) => {
                  const cell = getCellShifts(w.id, d)
                  return (
                    <View key={formatDateISO(d)} style={styles.gridCellWrap}>
                      {cell.length === 0 ? (
                        <Text style={styles.muted}>-</Text>
                      ) : (
                        cell.map((s) => (
                          <Text key={s.id} style={styles.value}>
                            {new Date(s.start_time).toLocaleTimeString('en-AU', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </Text>
                        ))
                      )}
                    </View>
                  )
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.color.background },
  container: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { color: tokens.color.foreground, fontSize: 26, fontWeight: '700' },
  subtitle: { color: tokens.color.mutedForeground },
  card: {
    backgroundColor: tokens.color.card,
    borderColor: tokens.color.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: ui.sectionTitle,
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: tokens.color.secondary,
  },
  chipOn: { backgroundColor: tokens.color.primary, borderColor: tokens.color.ring },
  chipText: { color: tokens.color.secondaryForeground, fontSize: 12, fontWeight: '600' },
  value: { color: tokens.color.foreground, fontWeight: '600' },
  muted: { color: tokens.color.mutedForeground },
  gridHeader: { flexDirection: 'row', borderBottomColor: tokens.color.border, borderBottomWidth: 1, paddingBottom: 8 },
  gridRow: { flexDirection: 'row', borderBottomColor: tokens.color.border, borderBottomWidth: 1, paddingVertical: 8 },
  gridCell: { width: 110, color: tokens.color.foreground, fontWeight: '700', fontSize: 12 },
  gridCellWrap: { width: 110, minHeight: 24, justifyContent: 'center' },
  workerCol: { width: 180 },
})
