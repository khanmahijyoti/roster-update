import { useEffect, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { formatDateISO, getWeekFromRange } from '../../lib/week-helpers'
import { tokens } from '../../theme/tokens'
import { ui } from '../../theme/styles'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Print from 'expo-print'

type WorkerStat = {
  worker_id: string
  worker_name: string
  worker_email: string
  total_hours: number
  shift_count: number
}

type ReportSummary = {
  restaurant_name: string
  week_start: string
  week_end: string
  total_shifts: number
  total_workers: number
  worker_stats: WorkerStat[]
}

type ReportRow = {
  id: string
  restaurant_id: string
  week_start_date: string
  week_end_date: string
  total_hours: number
  created_at: string
  summary_data: ReportSummary
}

type RestaurantRow = {
  id: string
  name: string
}

type WeekOption = {
  weekStart: Date
  weekEnd: Date
  label: string
}

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('')
  const [weeks, setWeeks] = useState<WeekOption[]>([])
  const [selectedWeekIndex, setSelectedWeekIndex] = useState(0)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    loadBootstrapData()
  }, [])

  async function loadBootstrapData() {
    await Promise.all([loadReports(), loadRestaurants(), loadWeeks()])
  }

  async function loadReports() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('weekly_reports')
        .select('*')
        .order('week_start_date', { ascending: false })

      if (error) throw error
      const rows = (data || []) as ReportRow[]
      setReports(rows)
      if (rows.length > 0) {
        setSelectedId(rows[0].id)
      }
    } catch (error) {
      console.error('Failed to load reports:', error)
      Alert.alert('Error', 'Could not load reports.')
    } finally {
      setLoading(false)
    }
  }

  async function loadRestaurants() {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id,name')
      .order('name')

    if (error) {
      console.error('Failed to load restaurants:', error)
      return
    }

    const rows = (data || []) as RestaurantRow[]
    setRestaurants(rows)
    if (rows.length > 0) {
      setSelectedRestaurantId(rows[0].id)
    }
  }

  async function loadWeeks() {
    const { data, error } = await supabase
      .from('shifts')
      .select('start_time')
      .order('start_time', { ascending: true })
      .limit(1)

    if (error) {
      console.error('Failed to load weeks:', error)
      return
    }

    const first = data?.[0]?.start_time ? new Date(data[0].start_time) : new Date()
    const generated = getWeekFromRange(first, new Date())
    setWeeks(generated)
    setSelectedWeekIndex(0)
  }

  async function handleGenerateReport() {
    if (!selectedRestaurantId) {
      Alert.alert('Missing restaurant', 'Please choose a restaurant first.')
      return
    }

    const selectedWeek = weeks[selectedWeekIndex]
    if (!selectedWeek) {
      Alert.alert('Missing week', 'No valid week selected.')
      return
    }

    try {
      setGenerating(true)

      const startDate = new Date(selectedWeek.weekStart)
      const endDate = new Date(selectedWeek.weekEnd)
      endDate.setHours(23, 59, 59, 999)

      const { data: shifts, error: shiftsError } = await supabase
        .from('shifts')
        .select(
          'worker_id,start_time,end_time,worker:profiles!worker_id(id,email,first_name,last_name),restaurant:restaurants(id,name)'
        )
        .eq('restaurant_id', selectedRestaurantId)
        .eq('status', 'published')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time')

      if (shiftsError) throw shiftsError

      const workerStats = new Map<
        string,
        {
          worker_id: string
          worker_name: string
          worker_email: string
          total_hours: number
          shift_count: number
          shifts: Array<{
            date: string
            start_time: string
            end_time: string
            hours: number
            restaurant_name: string
          }>
        }
      >()

      let totalHours = 0

      ;(shifts || []).forEach((shift: any) => {
        const start = new Date(shift.start_time)
        const end = new Date(shift.end_time)
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
        totalHours += hours

        const worker = Array.isArray(shift.worker) ? shift.worker[0] : shift.worker
        const restaurant = Array.isArray(shift.restaurant) ? shift.restaurant[0] : shift.restaurant

        if (!workerStats.has(shift.worker_id)) {
          workerStats.set(shift.worker_id, {
            worker_id: shift.worker_id,
            worker_name: `${worker?.first_name || ''} ${worker?.last_name || ''}`.trim(),
            worker_email: worker?.email || '',
            total_hours: 0,
            shift_count: 0,
            shifts: [],
          })
        }

        const stats = workerStats.get(shift.worker_id)
        if (!stats) return

        stats.total_hours += hours
        stats.shift_count += 1
        stats.shifts.push({
          date: formatDateISO(start),
          start_time: shift.start_time,
          end_time: shift.end_time,
          hours: Number(hours.toFixed(2)),
          restaurant_name: restaurant?.name || '',
        })
      })

      const workerStatsArray = Array.from(workerStats.values())
        .sort((a, b) => b.total_hours - a.total_hours)
        .map((x) => ({ ...x, total_hours: Number(x.total_hours.toFixed(2)) }))

      const firstShift: any = shifts?.[0]
      const firstRestaurant = Array.isArray(firstShift?.restaurant)
        ? firstShift?.restaurant?.[0]
        : firstShift?.restaurant

      const summaryData: ReportSummary = {
        restaurant_name:
          firstRestaurant?.name ||
          restaurants.find((r) => r.id === selectedRestaurantId)?.name ||
          '',
        week_start: formatDateISO(startDate),
        week_end: formatDateISO(endDate),
        total_shifts: shifts?.length || 0,
        total_workers: workerStatsArray.length,
        worker_stats: workerStatsArray,
      }

      const weekStart = formatDateISO(startDate)
      const weekEnd = formatDateISO(endDate)

      const { data: existingReport } = await supabase
        .from('weekly_reports')
        .select('id')
        .eq('restaurant_id', selectedRestaurantId)
        .eq('week_start_date', weekStart)
        .maybeSingle()

      if (existingReport?.id) {
        const { error: updateError } = await supabase
          .from('weekly_reports')
          .update({
            summary_data: summaryData,
            total_hours: Number(totalHours.toFixed(2)),
            week_end_date: weekEnd,
          })
          .eq('id', existingReport.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('weekly_reports').insert({
          restaurant_id: selectedRestaurantId,
          week_start_date: weekStart,
          week_end_date: weekEnd,
          summary_data: summaryData,
          total_hours: Number(totalHours.toFixed(2)),
        })

        if (insertError) throw insertError
      }

      Alert.alert('Success', 'Report generated successfully.')
      await loadReports()
    } catch (error: any) {
      console.error('Generate report failed:', error)
      Alert.alert('Failed', error?.message || 'Could not generate report.')
    } finally {
      setGenerating(false)
    }
  }

  const selected = reports.find((r) => r.id === selectedId) || null

  async function exportToCSV(report: ReportRow) {
    try {
      const summary = report.summary_data
      const lines = ['Worker Name,Worker Email,Total Hours,Shift Count']
      summary.worker_stats.forEach((worker) => {
        const safeName = worker.worker_name.replace(/"/g, '""')
        const safeEmail = worker.worker_email.replace(/"/g, '""')
        lines.push(`"${safeName}","${safeEmail}",${worker.total_hours},${worker.shift_count}`)
      })
      const csv = `${lines.join('\n')}\n`
      const uri = `${FileSystem.cacheDirectory}report-${summary.week_start}-${summary.week_end}.csv`
      await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 })

      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        Alert.alert('Export ready', `CSV saved at: ${uri}`)
        return
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Share report CSV',
      })
    } catch (error: any) {
      console.error('CSV export failed:', error)
      Alert.alert('Export failed', error?.message || 'Could not export CSV.')
    }
  }

  async function exportToPDF(report: ReportRow) {
    try {
      const summary = report.summary_data
      const rows = summary.worker_stats
        .map(
          (worker) => `
            <tr>
              <td>${worker.worker_name}</td>
              <td>${worker.worker_email}</td>
              <td style="text-align:right;">${worker.total_hours.toFixed(2)}</td>
              <td style="text-align:right;">${worker.shift_count}</td>
            </tr>
          `
        )
        .join('')

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #1f2937; }
              h1 { margin: 0 0 6px 0; color: #0f172a; }
              p { margin: 4px 0; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; }
              th { background: #f3f4f6; text-align: left; }
              .meta { margin-top: 8px; color: #4b5563; }
            </style>
          </head>
          <body>
            <h1>Weekly Report</h1>
            <p><strong>Restaurant:</strong> ${summary.restaurant_name}</p>
            <p><strong>Week:</strong> ${summary.week_start} to ${summary.week_end}</p>
            <p class="meta"><strong>Total shifts:</strong> ${summary.total_shifts} | <strong>Total workers:</strong> ${summary.total_workers} | <strong>Total hours:</strong> ${report.total_hours.toFixed(2)}</p>

            <table>
              <thead>
                <tr>
                  <th>Worker Name</th>
                  <th>Worker Email</th>
                  <th>Total Hours</th>
                  <th>Shift Count</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </body>
        </html>
      `

      const file = await Print.printToFileAsync({ html })
      const canShare = await Sharing.isAvailableAsync()
      if (!canShare) {
        Alert.alert('Export ready', `PDF saved at: ${file.uri}`)
        return
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share report PDF',
      })
    } catch (error: any) {
      console.error('PDF export failed:', error)
      Alert.alert('Export failed', error?.message || 'Could not export PDF.')
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Weekly Reports</Text>
        <Text style={styles.subtitle}>Read-only mobile report summaries</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Generate Report</Text>
          <Text style={styles.muted}>Restaurant</Text>
          <View style={styles.row}>
            {restaurants.map((restaurant) => (
              <Pressable
                key={restaurant.id}
                onPress={() => setSelectedRestaurantId(restaurant.id)}
                style={[styles.chip, selectedRestaurantId === restaurant.id ? styles.chipOn : null]}
              >
                <Text style={styles.chipText}>{restaurant.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.muted}>Week</Text>
          <View style={styles.row}>
            <Pressable
              onPress={() => setSelectedWeekIndex((v) => Math.max(0, v - 1))}
              style={styles.chip}
              disabled={selectedWeekIndex <= 0}
            >
              <Text style={styles.chipText}>Prev</Text>
            </Pressable>
            <Text style={styles.value}>{weeks[selectedWeekIndex]?.label || 'No week'}</Text>
            <Pressable
              onPress={() => setSelectedWeekIndex((v) => Math.min(weeks.length - 1, v + 1))}
              style={styles.chip}
              disabled={selectedWeekIndex >= weeks.length - 1}
            >
              <Text style={styles.chipText}>Next</Text>
            </Pressable>
          </View>

          <Pressable style={styles.generateBtn} disabled={generating} onPress={handleGenerateReport}>
            <Text style={styles.generateText}>{generating ? 'Generating...' : 'Generate / Refresh Report'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Reports</Text>
          {loading ? <Text style={styles.muted}>Loading...</Text> : null}
          {!loading && reports.length === 0 ? <Text style={styles.muted}>No reports yet.</Text> : null}
          {reports.map((report) => (
            <Pressable
              key={report.id}
              onPress={() => {
                setSelectedId(report.id)
                setDetailOpen(true)
              }}
              style={[styles.item, selectedId === report.id ? styles.itemOn : null]}
            >
              <Text style={styles.value}>{report.summary_data.restaurant_name}</Text>
              <Text style={styles.muted}>
                {new Date(report.week_start_date).toLocaleDateString('en-AU')} - {new Date(report.week_end_date).toLocaleDateString('en-AU')}
              </Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>

      <Modal visible={detailOpen && !!selected} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalBackdropTouch} onPress={() => setDetailOpen(false)} />
          {selected ? (
            <View style={styles.modalPanel}>
              <Text style={styles.sectionTitle}>Report Details</Text>
              <Text style={styles.value}>{selected.summary_data.restaurant_name}</Text>
              <Text style={styles.muted}>
                {selected.summary_data.week_start} to {selected.summary_data.week_end}
              </Text>
              <Text style={styles.muted}>Total hours: {selected.total_hours.toFixed(1)}</Text>
              <Text style={styles.muted}>Total shifts: {selected.summary_data.total_shifts}</Text>
              <Text style={styles.muted}>Total workers: {selected.summary_data.total_workers}</Text>

              <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Worker Hours</Text>
              <ScrollView style={styles.workerList}>
                {selected.summary_data.worker_stats.map((w) => (
                  <View key={w.worker_id} style={styles.item}>
                    <Text style={styles.value}>{w.worker_name}</Text>
                    <Text style={styles.muted}>{w.worker_email}</Text>
                    <Text style={styles.muted}>
                      {w.total_hours.toFixed(1)}h / {w.shift_count} shifts
                    </Text>
                  </View>
                ))}
              </ScrollView>

              <View style={styles.row}>
                <Pressable style={styles.generateBtn} onPress={() => exportToPDF(selected)}>
                  <Text style={styles.generateText}>Export PDF</Text>
                </Pressable>
                <Pressable style={styles.secondaryBtn} onPress={() => setDetailOpen(false)}>
                  <Text style={styles.secondaryBtnText}>Close</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
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
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
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
  item: {
    backgroundColor: tokens.color.secondary,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  itemOn: { borderColor: tokens.color.ring },
  value: { color: tokens.color.foreground, fontWeight: '600' },
  muted: { color: tokens.color.mutedForeground },
  generateBtn: {
    backgroundColor: tokens.color.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 2,
  },
  generateText: { color: tokens.color.primaryForeground, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalBackdropTouch: {
    flex: 1,
  },
  modalPanel: {
    backgroundColor: tokens.color.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderColor: tokens.color.border,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    maxHeight: '75%',
  },
  workerList: {
    maxHeight: 280,
  },
  secondaryBtn: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: tokens.color.secondary,
  },
  secondaryBtnText: {
    color: tokens.color.secondaryForeground,
    fontWeight: '700',
  },
})
