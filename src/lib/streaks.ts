export type Checkin = {
  checkin_date: string
  status: 'done' | 'skipped' | 'partial'
}

export type StreakResult = {
  current: number
  longest: number
  consistency30: number
  totalCheckins: number
}

function localDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getTodayInTimezone(timezone: string): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone })
}

function dateAdd(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return localDateStr(date)
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = new Date(ay, am - 1, ad)
  const db = new Date(by, bm - 1, bd)
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24))
}

function getISODay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const day = new Date(y, m - 1, d).getDay()
  return day === 0 ? 7 : day
}

export function computeStreaks(
  checkins: Checkin[],
  daysOfWeek: number[],
  timezone: string,
  createdDate?: string,
  todayOverride?: string
): StreakResult {
  const today = todayOverride ?? getTodayInTimezone(timezone)
  const daySet = new Set(daysOfWeek)

  const doneSet = new Set<string>()
  for (const c of checkins) {
    if (c.status === 'done') doneSet.add(c.checkin_date)
  }

  const uniqueDates = [...doneSet].sort()

  let longest = 0
  if (uniqueDates.length > 0) {
    let run = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = daysBetween(uniqueDates[i], uniqueDates[i - 1])
      if (diff === 1) {
        run++
      } else if (diff > 1) {
        let allSkipped = true
        let cursor = uniqueDates[i - 1]
        for (let j = 1; j < diff; j++) {
          cursor = dateAdd(uniqueDates[i - 1], j)
          if (daySet.has(getISODay(cursor))) {
            allSkipped = false
            break
          }
        }
        if (allSkipped) {
          run++
        } else {
          longest = Math.max(longest, run)
          run = 1
        }
      }
    }
    longest = Math.max(longest, run)
  }

  let current = 0
  if (doneSet.has(today)) {
    current = 1
  } else if (doneSet.has(dateAdd(today, -1))) {
    current = 1
    let cursor = dateAdd(today, -1)
    while (true) {
      const prev = dateAdd(cursor, -1)
      if (!daySet.has(getISODay(prev))) {
        cursor = prev
        continue
      }
      if (doneSet.has(prev)) {
        current++
        cursor = prev
      } else {
        break
      }
    }
  } else {
    current = 0
  }

  if (current > 0 && doneSet.has(today)) {
    let cursor = today
    while (true) {
      const prev = dateAdd(cursor, -1)
      if (!daySet.has(getISODay(prev))) {
        cursor = prev
        continue
      }
      if (doneSet.has(prev)) {
        current++
        cursor = prev
      } else {
        break
      }
    }
  }

  const thirtyDaysAgo = dateAdd(today, -29)
  const rangeStart = createdDate && createdDate > thirtyDaysAgo ? createdDate : thirtyDaysAgo

  let scheduledDays = 0
  let doneDays = 0
  if (rangeStart <= today) {
    let cursor = rangeStart
    while (cursor <= today) {
      if (daySet.has(getISODay(cursor))) {
        scheduledDays++
        if (doneSet.has(cursor)) doneDays++
      }
      cursor = dateAdd(cursor, 1)
    }
  }

  const consistency30 = scheduledDays > 0 ? Math.round((doneDays / scheduledDays) * 100) : 0

  return {
    current,
    longest,
    consistency30,
    totalCheckins: uniqueDates.length,
  }
}
