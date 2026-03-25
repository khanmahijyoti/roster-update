export type WeekBoundary = {
  start: Date
  end: Date
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function isAfterSaturdayLockout(): boolean {
  const now = new Date()
  const currentWeekStart = getWeekStart(now)
  const lockoutTime = new Date(currentWeekStart)
  lockoutTime.setDate(currentWeekStart.getDate() + 5)
  lockoutTime.setHours(23, 0, 0, 0)
  return now >= lockoutTime
}

export function getCurrentWeek(): WeekBoundary {
  const now = new Date()

  if (isAfterSaturdayLockout()) {
    const nextMonday = new Date(getWeekStart(now))
    nextMonday.setDate(nextMonday.getDate() + 7)
    return {
      start: nextMonday,
      end: getWeekEnd(nextMonday),
    }
  }

  return {
    start: getWeekStart(now),
    end: getWeekEnd(now),
  }
}

export function getNextWeek(): WeekBoundary {
  const now = new Date()
  const currentWeekStart = getWeekStart(now)

  if (isAfterSaturdayLockout()) {
    const nextNextMonday = new Date(currentWeekStart)
    nextNextMonday.setDate(currentWeekStart.getDate() + 14)
    return {
      start: nextNextMonday,
      end: getWeekEnd(nextNextMonday),
    }
  }

  const nextMonday = new Date(currentWeekStart)
  nextMonday.setDate(currentWeekStart.getDate() + 7)
  return {
    start: nextMonday,
    end: getWeekEnd(nextMonday),
  }
}

export function isAvailabilityLocked(): boolean {
  const nextWeek = getNextWeek()
  const now = new Date()
  const lockoutWeekStart = new Date(nextWeek.start)
  lockoutWeekStart.setDate(lockoutWeekStart.getDate() - 7)

  const lockoutTime = new Date(lockoutWeekStart)
  lockoutTime.setDate(lockoutWeekStart.getDate() + 5)
  lockoutTime.setHours(23, 0, 0, 0)

  return now >= lockoutTime
}

export function canEditAvailability(date: Date): boolean {
  const nextWeek = getNextWeek()
  const dateStr = formatDateISO(date)
  const startStr = formatDateISO(nextWeek.start)
  const endStr = formatDateISO(nextWeek.end)

  if (dateStr < startStr || dateStr > endStr) {
    return false
  }

  return !isAvailabilityLocked()
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDatesInWeek(week: WeekBoundary): Date[] {
  const dates: Date[] = []
  const current = new Date(week.start)

  while (current <= week.end) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }

  return dates
}

export function getShortDayName(date: Date): string {
  return date.toLocaleDateString('en-AU', { weekday: 'short' })
}

export function formatClock(value: string): string {
  return new Date(value).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function calculateHours(start: string, end: string): number {
  const startAt = new Date(start).getTime()
  const endAt = new Date(end).getTime()
  return (endAt - startAt) / (1000 * 60 * 60)
}
