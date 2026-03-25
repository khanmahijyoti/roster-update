type WeekBoundary = {
  start: Date
  end: Date
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDatesInWeek(week: WeekBoundary): Date[] {
  const dates: Date[] = []
  const cursor = new Date(week.start)
  while (cursor <= week.end) {
    dates.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

function weekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function getWeekFromRange(startDate: Date, endDate: Date) {
  const first = weekStart(startDate)
  const last = new Date(endDate)
  const weeks: Array<{ weekStart: Date; weekEnd: Date; label: string }> = []
  const cursor = new Date(first)

  while (cursor <= last) {
    const weekEnd = new Date(cursor)
    weekEnd.setDate(cursor.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)
    weeks.push({
      weekStart: new Date(cursor),
      weekEnd,
      label: `${cursor.toLocaleDateString('en-AU')} - ${weekEnd.toLocaleDateString('en-AU')}`,
    })
    cursor.setDate(cursor.getDate() + 7)
  }

  return weeks.reverse()
}
