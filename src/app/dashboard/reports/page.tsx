'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeStreaks, type Checkin } from '@/lib/streaks'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import BottomNav from '@/components/bottom-nav'
import HabitSheet from '@/components/habit-sheet'
import StreakShareDialog from '@/components/streak-share-dialog'
import { Flame, Trophy, TrendingUp, BarChart3, Share2 } from 'lucide-react'

type Schedule = { send_time: string; days_of_week: number[] }
type Habit = {
  id: string
  name: string
  description: string | null
  frequency: string
  color: string
  is_active: boolean
  created_at: string
  schedules: Schedule[]
}
type HabitStreak = { current: number; longest: number; consistency30: number; totalCheckins: number }

const DAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLast7Days(tz: string): string[] {
  const days: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toLocaleDateString('en-CA', { timeZone: tz }))
  }
  return days
}

export default function ReportsPage() {
  const router = useRouter()
  const [habits, setHabits] = useState<Habit[]>([])
  const [streaks, setStreaks] = useState<Record<string, HabitStreak>>({})
  const [habitCheckins, setHabitCheckins] = useState<Record<string, Checkin[]>>({})
  const [profileTz, setProfileTz] = useState('Asia/Jakarta')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [shareHabit, setShareHabit] = useState<Habit | null>(null)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const fullName = user.user_metadata?.full_name as string | undefined
    setUserName(fullName || user.email?.split('@')[0] || 'User')

    const { data: prof } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
    if (!prof) { router.push('/onboarding'); return }
    const tz = prof.timezone || 'Asia/Jakarta'
    setProfileTz(tz)

    const { data: hData } = await supabase
      .from('habits')
      .select('*, schedules(*)')
      .eq('user_id', user.id)
      .order('sort_order')
      .order('created_at')

    if (!hData || hData.length === 0) {
      setLoading(false)
      return
    }

    setHabits(hData)

    const allStreaks: Record<string, HabitStreak> = {}
    const allCheckins: Record<string, Checkin[]> = {}

    for (const habit of hData) {
      const { data: checkins } = await supabase
        .from('checkins')
        .select('checkin_date, status')
        .eq('habit_id', habit.id)
        .eq('user_id', user.id)

      const cArr = (checkins || []) as Checkin[]
      allCheckins[habit.id] = cArr

      const dow = habit.schedules?.[0]?.days_of_week || [1, 2, 3, 4, 5, 6, 7]
      allStreaks[habit.id] = computeStreaks(cArr, dow, tz, habit.created_at?.split('T')[0])
    }

    setHabitCheckins(allCheckins)
    setStreaks(allStreaks)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function getToday(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: profileTz })
  }

  function isoDay(dateStr: string): number {
    const [y, m, d] = dateStr.split('-').map(Number)
    const day = new Date(y, m - 1, d).getDay()
    return day === 0 ? 7 : day
  }

  function dateAdd(ds: string, days: number): string {
    const [y, m, d] = ds.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    date.setDate(date.getDate() + days)
    return dateStr(date)
  }

  let bestCurrent = 0
  let bestLongest = 0
  let totalDone30 = 0
  let totalScheduled30 = 0
  for (const hid of Object.keys(streaks)) {
    const s = streaks[hid]
    const h = habits.find((hh) => hh.id === hid)
    if (h?.is_active !== false) {
      if (s.current > bestCurrent) bestCurrent = s.current
      if (s.longest > bestLongest) bestLongest = s.longest
    }

    const checkins = habitCheckins[hid] || []
    const doneSet = new Set(checkins.filter((c) => c.status === 'done').map((c) => c.checkin_date))
    const dow = h?.schedules?.[0]?.days_of_week || [1, 2, 3, 4, 5, 6, 7]
    const daySet = new Set(dow)

    const today = getToday()
    const thirtyDaysAgo = dateAdd(today, -29)
    const createdDate = h?.created_at?.split('T')[0]
    const rangeStart = createdDate && createdDate > thirtyDaysAgo ? createdDate : thirtyDaysAgo

    if (rangeStart <= today) {
      let cursor = rangeStart
      while (cursor <= today) {
        if (daySet.has(isoDay(cursor))) {
          totalScheduled30++
          if (doneSet.has(cursor)) totalDone30++
        }
        cursor = dateAdd(cursor, 1)
      }
    }
  }
  const overallConsistency = totalScheduled30 > 0 ? Math.round((totalDone30 / totalScheduled30) * 100) : 0

  function getSparklineData(habitId: string): number[] {
    const last7 = getLast7Days(profileTz)
    const checkins = habitCheckins[habitId] || []
    const doneSet = new Set(checkins.filter((c) => c.status === 'done').map((c) => c.checkin_date))
    return last7.map((d) => (doneSet.has(d) ? 1 : 0))
  }

  function getShareHeatmapData(habitId: string): boolean[] {
    const result: boolean[] = []
    const checkins = habitCheckins[habitId] || []
    const doneSet = new Set(checkins.filter((c) => c.status === 'done').map((c) => c.checkin_date))
    for (let i = 27; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = dateStr(d)
      result.push(doneSet.has(key))
    }
    return result
  }

  function getHeatmapEntries(habitId: string) {
    const today = getToday()
    const [ty, tm, td] = today.split('-').map(Number)
    const end = new Date(ty, tm - 1, td)
    const start = new Date(end)
    start.setDate(start.getDate() - 29)

    const checkins = habitCheckins[habitId] || []
    const doneSet = new Set(checkins.filter((c) => c.status === 'done').map((c) => c.checkin_date))

    const entries: { date: string; done: boolean }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      entries.push({
        date: dateStr(d),
        done: doneSet.has(dateStr(d)),
      })
    }
    return entries
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-8 w-28 bg-muted rounded animate-pulse mb-8" />
        <div className="h-24 bg-muted rounded-2xl animate-pulse mb-6" />
        {[1, 2].map((i) => (
          <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse mb-4" />
        ))}
      </div>
    )
  }

  if (habits.length === 0) {
    return (
      <>
        <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
          <p className="text-[13px] text-muted-foreground font-medium">Your progress</p>
          <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Laporan</h1>
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-accent/40 flex items-center justify-center mx-auto mb-5">
              <BarChart3 className="w-8 h-8 text-primary" />
            </div>
            <p className="font-semibold text-lg">Belum ada laporan</p>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-[240px] mx-auto">
              Buat habit dan mulai check-in untuk melihat statistik
            </p>
          </div>
          <BottomNav onAddClick={() => setShowCreateSheet(true)} />
        </div>

        <HabitSheet
          open={showCreateSheet}
          onOpenChange={setShowCreateSheet}
          onSuccess={() => router.push('/dashboard')}
        />
      </>
    )
  }

  return (
    <>
    <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
      <div>
        <p className="text-[13px] text-muted-foreground font-medium">Your progress</p>
        <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Laporan</h1>
      </div>

      <div className="mt-6 space-y-5">
        <Card className="rounded-2xl shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]">
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">{bestCurrent}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">🔥 Streak</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">{bestLongest}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">🏆 Terbaik</p>
              </div>
              <div className="text-center">
                <p className="font-mono text-2xl font-semibold tabular-nums">{overallConsistency}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Konsistensi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {habits.map((habit) => {
          const s = streaks[habit.id]
          const sparkline = getSparklineData(habit.id)
          const heatmapEntries = getHeatmapEntries(habit.id)
          const color = habit.color || '#22c55e'
          const today = getToday()

          const firstDate = heatmapEntries[0]?.date
          const firstDay = firstDate ? new Date(firstDate).getDay() : 1
          const padStart = firstDay === 0 ? 6 : firstDay - 1

          return (
            <div
              key={habit.id}
              className="relative rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] overflow-hidden"
            >
              <div
                className="absolute left-4 top-4 bottom-4 w-1 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="p-5 pl-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <h2 className="font-medium text-base">{habit.name}</h2>
                  </div>
                  <div className="flex items-end gap-[3px] h-8">
                    {sparkline.map((val, i) => (
                      <div
                        key={i}
                        className="w-[6px] rounded-sm transition-all"
                        style={{
                          height: val ? '100%' : '30%',
                          backgroundColor: val ? color : 'hsl(var(--border))',
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-muted/60 p-3">
                    <Flame className="w-3.5 h-3.5 text-primary mb-1.5" />
                    <p className="font-mono text-xl font-semibold tabular-nums leading-none">{s?.current || 0}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Current</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <Trophy className="w-3.5 h-3.5 text-primary mb-1.5" />
                    <p className="font-mono text-xl font-semibold tabular-nums leading-none">{s?.longest || 0}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Best</p>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-3">
                    <TrendingUp className="w-3.5 h-3.5 text-primary mb-1.5" />
                    <p className="font-mono text-xl font-semibold tabular-nums leading-none">{s?.consistency30 || 0}%</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Rate</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">30 hari terakhir</p>

                  <div className="grid grid-cols-7 gap-1">
                    {DAY_HEADERS.map((d) => (
                      <div key={d} className="text-[10px] text-muted-foreground font-medium text-center">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1 mt-1">
                    {Array.from({ length: padStart }).map((_, i) => (
                      <div key={`pad-${i}`} className="aspect-square" />
                    ))}
                    {heatmapEntries.map((entry) => {
                      const isToday = entry.date === today
                      return (
                        <div
                          key={entry.date}
                          className={`aspect-square rounded-md transition-colors duration-200 ${
                            entry.done ? '' : 'bg-muted'
                          } ${isToday ? 'ring-[1.5px] ring-primary ring-offset-1 ring-offset-background' : ''}`}
                          style={entry.done ? {
                            backgroundColor: color,
                            opacity: 0.6,
                          } : undefined}
                        />
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground">
                    Total: {s?.totalCheckins || 0}x check-in
                  </p>
                  <button
                    onClick={() => setShareHabit(habit)}
                    className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                  >
                    <Share2 className="w-3 h-3" />
                    Bagikan 🔥
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <BottomNav onAddClick={() => setShowCreateSheet(true)} />
      </div>

      <HabitSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onSuccess={() => router.push('/dashboard')}
      />

      <StreakShareDialog
        key={shareHabit?.id || 'none'}
        open={!!shareHabit}
        onOpenChange={(o) => !o && setShareHabit(null)}
        habitName={shareHabit?.name || ''}
        streak={streaks[shareHabit?.id || '']?.current || 0}
        color={shareHabit?.color || '#22c55e'}
        heatmapData={shareHabit ? getShareHeatmapData(shareHabit.id) : []}
        userName={userName}
      />
    </>
  )
}
