import { useEffect, useMemo, useState } from 'react'
import { Stack, useRouter } from 'expo-router'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useSession } from '../../context/session-context'
import { formatDateISO, getCurrentWeek, getDatesInWeek, getNextWeek } from '../../lib/date-utils'
import { tokens } from '../../theme/tokens'
import { ui } from '../../theme/styles'

type RestaurantRow = { id: string; name: string }
type ShiftRow = {
  id: string
  status: 'draft' | 'published'
  start_time: string
  end_time: string
  worker_id: string
  restaurant_id: string
}
type WorkerRow = { id: string; first_name: string; last_name: string }
type AvailabilityRow = { user_id: string; date: string; can_work_morning: boolean; can_work_afternoon: boolean }

export default function AdminScreen() {
  const { session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [selectedWeek, setSelectedWeek] = useState<'current' | 'next'>('current')
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [availability, setAvailability] = useState<Map<string, AvailabilityRow>>(new Map())
  const [selectedWorker, setSelectedWorker] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [conflictDates, setConflictDates] = useState<Set<string>>(new Set())

  const currentWeek = useMemo(() => getCurrentWeek(), [])
  const nextWeek = useMemo(() => getNextWeek(), [])
  const activeWeek = selectedWeek === 'current' ? currentWeek : nextWeek
  const weekDates = useMemo(() => getDatesInWeek(activeWeek), [activeWeek.start.getTime(), activeWeek.end.getTime()])

  useEffect(() => {
    loadRestaurants()
    loadWorkers()
  }, [])

  useEffect(() => {
    if (selectedRestaurant) {
      loadShifts()
    }
  }, [selectedRestaurant, selectedWeek])

  useEffect(() => {
    if (workers.length > 0) {
      loadAvailability()
      if (!selectedWorker) {
        setSelectedWorker(workers[0].id)
      }
    }

    if (weekDates.length > 0 && !selectedDate) {
      setSelectedDate(formatDateISO(weekDates[0]))
    }
  }, [workers.length, selectedWeek])

  async function loadRestaurants() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('id,name')
        .order('name')

      if (error) throw error
      const list = (data || []) as RestaurantRow[]
      setRestaurants(list)
      if (list.length > 0) {
        setSelectedRestaurant(list[0].id)
      }
    } catch (error) {
      console.error('Failed to load restaurants:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadShifts() {
    try {
      const weekEnd = new Date(activeWeek.end)
      weekEnd.setHours(23, 59, 59, 999)

      const { data, error } = await supabase
        .from('shifts')
        .select('id,status,start_time,end_time,worker_id,restaurant_id')
        .gte('start_time', activeWeek.start.toISOString())
        .lte('start_time', weekEnd.toISOString())

      if (error) throw error
      const allWeekShifts = (data || []) as ShiftRow[]
      setShifts(allWeekShifts.filter((shift) => shift.restaurant_id === selectedRestaurant))

      const nextConflicts = new Set<string>()
      allWeekShifts.forEach((shift) => {
        if (shift.restaurant_id !== selectedRestaurant) {
          const shiftDate = formatDateISO(new Date(shift.start_time))
          nextConflicts.add(`${shift.worker_id}_${shiftDate}`)
        }
      })
      setConflictDates(nextConflicts)
    } catch (error) {
      console.error('Failed to load shifts:', error)
    }
  }

  async function loadWorkers() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,first_name,last_name')
        .eq('role', 'worker')
        .order('first_name')

      if (error) throw error
      const rows = (data || []) as WorkerRow[]
      setWorkers(rows)
      if (rows.length > 0 && !selectedWorker) {
        setSelectedWorker(rows[0].id)
      }
    } catch (error) {
      console.error('Failed to load workers:', error)
    }
  }

  async function loadAvailability() {
    if (workers.length === 0) return
    try {
      const { data, error } = await supabase
        .from('availability')
        .select('user_id,date,can_work_morning,can_work_afternoon')
        .in(
          'user_id',
          workers.map((w) => w.id)
        )
        .gte('date', formatDateISO(activeWeek.start))
        .lte('date', formatDateISO(activeWeek.end))

      if (error) throw error
      const map = new Map<string, AvailabilityRow>()
      ;(data || []).forEach((row) => {
        map.set(`${row.user_id}_${row.date}`, row as AvailabilityRow)
      })
      setAvailability(map)
    } catch (error) {
      console.error('Failed to load availability:', error)
    }
  }

  function getWorkerName(workerId: string) {
    const worker = workers.find((w) => w.id === workerId)
    if (!worker) return 'Worker'
    return `${worker.first_name} ${worker.last_name}`
  }

  function getAvailabilityStatus(workerId: string, date: string) {
    if (conflictDates.has(`${workerId}_${date}`)) return 'conflict'
    const row = availability.get(`${workerId}_${date}`)
    if (!row) return 'available'
    if (!row.can_work_morning && !row.can_work_afternoon) return 'unavailable'
    return 'available'
  }

  function getShiftsForCell(workerId: string, date: string) {
    return shifts.filter((shift) => {
      const shiftDate = formatDateISO(new Date(shift.start_time))
      return shift.worker_id === workerId && shiftDate === date
    })
  }

  function selectCell(workerId: string, date: string) {
    if (conflictDates.has(`${workerId}_${date}`)) {
      Alert.alert('Conflict', 'Worker already has a shift at another restaurant on this day.')
      return
    }
    setSelectedWorker(workerId)
    setSelectedDate(date)
    setEditingShiftId(null)
    setStartTime('09:00')
    setEndTime('17:00')
    setEditorOpen(true)
  }

  function resetEditor() {
    setEditingShiftId(null)
    setSelectedWorker('')
    setSelectedDate('')
    setStartTime('09:00')
    setEndTime('17:00')
    setEditorOpen(false)
  }

  function loadIntoEditor(shift: ShiftRow) {
    const start = new Date(shift.start_time)
    const end = new Date(shift.end_time)
    setEditingShiftId(shift.id)
    setSelectedWorker(shift.worker_id)
    setSelectedDate(formatDateISO(start))
    setStartTime(`${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`)
    setEndTime(`${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`)
    setEditorOpen(true)
  }

  async function saveShift() {
    if (!selectedRestaurant || !selectedWorker || !selectedDate) {
      Alert.alert('Missing fields', 'Please choose restaurant, worker and date.')
      return
    }

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    if (Number.isNaN(startH) || Number.isNaN(startM) || Number.isNaN(endH) || Number.isNaN(endM)) {
      Alert.alert('Invalid time', 'Use HH:MM format, e.g. 09:00')
      return
    }

    const start = new Date(`${selectedDate}T${startTime}:00`)
    const end = new Date(`${selectedDate}T${endTime}:00`)

    if (end <= start) {
      Alert.alert('Invalid shift', 'End time must be after start time.')
      return
    }

    if (startH < 8 || endH > 23 || (endH === 23 && endM > 0)) {
      Alert.alert('Invalid hours', 'Shifts must be between 08:00 and 23:00.')
      return
    }

    const availStatus = getAvailabilityStatus(selectedWorker, selectedDate)
    if (availStatus === 'unavailable') {
      Alert.alert('Unavailable worker', 'This worker marked this day unavailable.')
      return
    }

    if (availStatus === 'conflict') {
      Alert.alert('Conflict', 'Worker already has a shift at another restaurant on this day.')
      return
    }

    setSaving(true)
    try {
      let conflictQuery = supabase
        .from('shifts')
        .select('id')
        .eq('worker_id', selectedWorker)
        .lt('start_time', end.toISOString())
        .gt('end_time', start.toISOString())

      if (editingShiftId) {
        conflictQuery = conflictQuery.neq('id', editingShiftId)
      }

      const { data: conflicts, error: conflictError } = await conflictQuery.limit(1)
      if (conflictError) throw conflictError
      if (conflicts && conflicts.length > 0) {
        Alert.alert('Conflict', 'Worker already has an overlapping shift.')
        return
      }

      if (editingShiftId) {
        const { error } = await supabase
          .from('shifts')
          .update({
            worker_id: selectedWorker,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
          })
          .eq('id', editingShiftId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('shifts')
          .insert({
            restaurant_id: selectedRestaurant,
            worker_id: selectedWorker,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            status: 'published',
          })
        if (error) throw error
      }

      resetEditor()
      await loadShifts()
      Alert.alert('Saved', 'Shift saved successfully.')
    } catch (error: any) {
      console.error('Save shift failed:', error)
      Alert.alert('Failed', error?.message || 'Could not save shift.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteShift(shiftId: string) {
    Alert.alert('Delete shift', 'Are you sure you want to delete this shift?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('shifts').delete().eq('id', shiftId)
            if (error) throw error
            if (editingShiftId === shiftId) {
              resetEditor()
            }
            await loadShifts()
          } catch (error: any) {
            console.error('Delete shift failed:', error)
            Alert.alert('Failed', error?.message || 'Could not delete shift.')
          }
        },
      },
    ])
  }

  async function onSignOut() {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const draftCount = shifts.filter((s) => s.status === 'draft').length
  const publishedCount = shifts.filter((s) => s.status === 'published').length
  const totalHours = shifts.reduce((sum, shift) => {
    const h = (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / (1000 * 60 * 60)
    return sum + h
  }, 0)

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#38bdf8" />
          <Text style={styles.subtitle}>Loading admin dashboard...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setMenuOpen(true)} style={styles.headerMenuBtn}>
              <Text style={styles.headerMenuText}>☰</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.subtitle}>{session?.user.email ?? 'Unknown'}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Controls</Text>
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

          <View style={styles.row}>
            <Pressable
              onPress={() => setSelectedWeek('current')}
              style={[styles.chip, selectedWeek === 'current' ? styles.chipOn : null]}
            >
              <Text style={styles.chipText}>Current Week</Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedWeek('next')}
              style={[styles.chip, selectedWeek === 'next' ? styles.chipOn : null]}
            >
              <Text style={styles.chipText}>Next Week</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Week Snapshot</Text>
          <Text style={styles.muted}>Draft shifts: {draftCount}</Text>
          <Text style={styles.muted}>Published shifts: {publishedCount}</Text>
          <Text style={styles.value}>Total hours: {totalHours.toFixed(1)}h</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Roster Grid (Tap Cell to Create)</Text>
          <ScrollView horizontal>
            <View>
              <View style={styles.gridHeaderRow}>
                <Text style={[styles.gridHeaderCell, styles.workerHeaderCell]}>Worker</Text>
                {weekDates.map((date) => {
                  const dateStr = formatDateISO(date)
                  return (
                    <Text key={dateStr} style={styles.gridHeaderCell}>
                      {date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })}
                    </Text>
                  )
                })}
              </View>

              {workers.map((worker) => (
                <View key={worker.id} style={styles.gridBodyRow}>
                  <Text style={[styles.gridWorkerCell, styles.workerHeaderCell]}>
                    {worker.first_name} {worker.last_name}
                  </Text>

                  {weekDates.map((date) => {
                    const dateStr = formatDateISO(date)
                    const cellShifts = getShiftsForCell(worker.id, dateStr)
                    const status = getAvailabilityStatus(worker.id, dateStr)
                    const selected = selectedWorker === worker.id && selectedDate === dateStr

                    return (
                      <View
                        key={`${worker.id}_${dateStr}`}
                        style={[
                          styles.gridCell,
                          status === 'unavailable'
                            ? styles.gridCellUnavailable
                            : status === 'conflict'
                            ? styles.gridCellConflict
                            : styles.gridCellAvailable,
                          selected ? styles.gridCellSelected : null,
                        ]}
                      >
                        {status === 'conflict' ? (
                          <View style={styles.conflictBadge}>
                            <Text style={styles.conflictBadgeText}>!</Text>
                          </View>
                        ) : null}
                        {cellShifts.length === 0 ? (
                          <Pressable
                            onPress={() => selectCell(worker.id, dateStr)}
                            style={styles.plusBtn}
                            disabled={status === 'unavailable' || status === 'conflict'}
                          >
                            <Text style={styles.plusText}>+</Text>
                          </Pressable>
                        ) : (
                          cellShifts.map((shift) => (
                            <Pressable
                              key={shift.id}
                              onPress={() => loadIntoEditor(shift)}
                              style={styles.gridShiftTag}
                            >
                              <Text style={styles.gridShiftText}>
                                {new Date(shift.start_time).toLocaleTimeString('en-AU', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false,
                                })}
                              </Text>
                            </Pressable>
                          ))
                        )}
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.muted}>Tap + in a cell to open shift editor.</Text>
        </View>

      </ScrollView>

      <Modal visible={menuOpen} transparent animationType="fade">
        <View style={styles.menuBackdrop}>
          <Pressable style={styles.menuBackdropTouch} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuPanel}>
            <Text style={styles.sectionTitle}>More</Text>
            <Pressable
              style={styles.navBtn}
              onPress={() => {
                setMenuOpen(false)
                router.push('/(app)/restaurants')
              }}
            >
              <Text style={styles.navText}>Open Restaurants</Text>
            </Pressable>
            <Pressable
              style={styles.navBtn}
              onPress={() => {
                setMenuOpen(false)
                router.push('/(app)/reports')
              }}
            >
              <Text style={styles.navText}>Open Reports</Text>
            </Pressable>
            <Pressable
              style={styles.navBtn}
              onPress={() => {
                setMenuOpen(false)
                router.push('/(app)/archive')
              }}
            >
              <Text style={styles.navText}>Open Archive</Text>
            </Pressable>
            <Pressable
              style={styles.signOutMenuBtn}
              onPress={() => {
                setMenuOpen(false)
                onSignOut()
              }}
            >
              <Text style={styles.signOutMenuText}>Sign out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={editorOpen && !!selectedWorker && !!selectedDate} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropTouch} onPress={resetEditor} />
          <View style={styles.floatingPanel}>
            <Text style={styles.sectionTitle}>{editingShiftId ? 'Edit Shift' : 'Create Shift'}</Text>
            <Text style={styles.availabilityNote}>
              {getWorkerName(selectedWorker)} on{' '}
              {selectedDate
                ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-AU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                  })
                : ''}
              {' - '}Status: {selectedWorker && selectedDate ? getAvailabilityStatus(selectedWorker, selectedDate) : 'available'}
            </Text>

            <View style={styles.timeRow}>
              <View style={styles.timeInputWrap}>
                <Text style={styles.muted}>Start (HH:MM)</Text>
                <TextInput
                  value={startTime}
                  onChangeText={setStartTime}
                  style={styles.input}
                  placeholder="09:00"
                  placeholderTextColor={tokens.color.mutedForeground}
                />
              </View>
              <View style={styles.timeInputWrap}>
                <Text style={styles.muted}>End (HH:MM)</Text>
                <TextInput
                  value={endTime}
                  onChangeText={setEndTime}
                  style={styles.input}
                  placeholder="17:00"
                  placeholderTextColor={tokens.color.mutedForeground}
                />
              </View>
            </View>

            <View style={styles.row}>
              <Pressable onPress={saveShift} style={styles.primaryBtn} disabled={saving}>
                <Text style={styles.primaryBtnText}>
                  {saving ? 'Saving...' : editingShiftId ? 'Update Shift' : 'Create Shift'}
                </Text>
              </Pressable>
              <Pressable onPress={resetEditor} style={styles.navBtn}>
                <Text style={styles.navText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: tokens.color.background },
  container: { padding: 16, gap: 12, paddingBottom: 28 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { color: tokens.color.foreground, fontSize: 26, fontWeight: '700' },
  subtitle: { color: tokens.color.mutedForeground, marginTop: 6 },
  headerMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMenuText: { color: '#ffffff', fontSize: 18, fontWeight: '700', lineHeight: 18 },
  card: {
    backgroundColor: tokens.color.card,
    borderColor: tokens.color.border,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  sectionTitle: ui.sectionTitle,
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  muted: { color: tokens.color.mutedForeground },
  value: { color: tokens.color.foreground, fontWeight: '700' },
  navBtn: {
    backgroundColor: tokens.color.secondary,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  navText: { color: tokens.color.secondaryForeground, fontWeight: '700' },
  signOutMenuBtn: {
    backgroundColor: tokens.color.destructive,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  signOutMenuText: {
    color: tokens.color.destructiveForeground,
    fontWeight: '700',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  menuBackdropTouch: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  menuPanel: {
    marginTop: 74,
    marginRight: 16,
    width: 220,
    backgroundColor: tokens.color.card,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  menuText: { color: tokens.color.foreground, fontSize: 18, fontWeight: '700', lineHeight: 18 },
  availabilityNote: {
    color: tokens.color.mutedForeground,
    fontSize: 12,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  timeInputWrap: {
    flex: 1,
    gap: 6,
  },
  input: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: tokens.color.card,
    color: tokens.color.foreground,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryBtn: {
    backgroundColor: tokens.color.primary,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: tokens.color.primaryForeground,
    fontWeight: '700',
  },
  gridHeaderRow: {
    flexDirection: 'row',
    borderBottomColor: tokens.color.border,
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 8,
  },
  gridBodyRow: {
    flexDirection: 'row',
    borderBottomColor: tokens.color.border,
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  gridHeaderCell: {
    width: 100,
    color: tokens.color.foreground,
    fontWeight: '700',
    fontSize: 12,
  },
  workerHeaderCell: {
    width: 150,
  },
  gridWorkerCell: {
    color: tokens.color.foreground,
    fontWeight: '600',
    fontSize: 12,
    paddingTop: 6,
  },
  gridCell: {
    width: 100,
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    padding: 4,
    justifyContent: 'center',
    gap: 3,
  },
  gridCellAvailable: {
    borderColor: tokens.color.border,
    backgroundColor: tokens.color.card,
  },
  gridCellUnavailable: {
    borderColor: tokens.color.destructive,
    backgroundColor: '#fde8e5',
  },
  gridCellConflict: {
    borderColor: '#d97706',
    backgroundColor: '#fef3c7',
  },
  gridCellSelected: {
    borderColor: tokens.color.ring,
    borderWidth: 2,
  },
  conflictBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conflictBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 10,
  },
  gridEmptyText: {
    color: tokens.color.mutedForeground,
    textAlign: 'center',
    fontWeight: '700',
  },
  plusBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: tokens.color.primary,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    color: tokens.color.primaryForeground,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  gridShiftTag: {
    backgroundColor: tokens.color.primary,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  gridShiftText: {
    color: tokens.color.primaryForeground,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  floatingPanel: {
    backgroundColor: tokens.color.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: tokens.color.border,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
})
