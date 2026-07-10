'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeStreaks, type Checkin } from '@/lib/streaks'
import { DndContext, DragEndEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { ChevronDown, ChevronRight, Bell, BellOff, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import HabitCard from '@/components/habit-card'
import HabitSheet from '@/components/habit-sheet'
import ProgressRing from '@/components/progress-ring'
import BottomNav from '@/components/bottom-nav'
import StreakShareDialog from '@/components/streak-share-dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Profile = {
  wa_number: string | null
  wa_verified: boolean
  timezone: string
  opted_out: boolean
}

type Schedule = {
  id?: string
  send_time: string
  days_of_week: number[]
}

type Habit = {
  id: string
  name: string
  description: string | null
  frequency: string
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
  schedules: Schedule[]
}

type HabitStreak = {
  current: number
  longest: number
  consistency30: number
}

function getGreeting(tz: string): string {
  const hour = new Date().toLocaleString('en', { hour: 'numeric', hour12: false, timeZone: tz })
  const h = parseInt(hour)
  if (h < 12) return 'Selamat pagi'
  if (h < 15) return 'Selamat siang'
  if (h < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function formatDate(tz: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  const d = new Date()
  const dateStr = d.toLocaleDateString('en-CA', { timeZone: tz })
  const [y, m, day] = dateStr.split('-').map(Number)
  return `${day} ${months[m - 1]} ${y}`
}

const DAY_MAP: Record<string, number> = {
  sunday: 7, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}

function getTodayDayNum(tz: string): number {
  const dayName = new Date().toLocaleDateString('en', { weekday: 'long', timeZone: tz }).toLowerCase()
  return DAY_MAP[dayName] || new Date().getDay() || 7
}

function formatTime(time: string): string {
  return time.slice(0, 5).replace(':', '.')
}

const DAY_LABELS = ['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function labelDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b)
  if (sorted.length === 7) return 'Setiap hari'
  if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) return 'Hari kerja'
  if (sorted.length === 2 && sorted[0] === 6 && sorted[1] === 7) return 'Akhir pekan'
  return sorted.map((d) => DAY_LABELS[d]).join(', ')
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitStreaks, setHabitStreaks] = useState<Record<string, HabitStreak>>({})
  const [todayCheckins, setTodayCheckins] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showNonScheduled, setShowNonScheduled] = useState(false)

  const [editHabit, setEditHabit] = useState<Habit | null>(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  const [deleteHabit, setDeleteHabit] = useState<Habit | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDisableReminder, setShowDisableReminder] = useState(false)
  const [togglingReminder, setTogglingReminder] = useState(false)
  const [userName, setUserName] = useState('')
  const [celebrateHabit, setCelebrateHabit] = useState<{ habitId: string; name: string; color: string; streak: number; heatmapData: boolean[] } | null>(null)

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  const sensors = useSensors(pointerSensor, touchSensor)

  async function reload() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('wa_number, wa_verified, timezone, opted_out')
      .eq('id', user.id)
      .single()

    const fullName = user.user_metadata?.full_name as string | undefined
    setUserName(fullName || user.email?.split('@')[0] || 'User')

    const { data: habitData } = await supabase
      .from('habits')
      .select('*, schedules(*)')
      .eq('user_id', user.id)
      .order('sort_order')
      .order('created_at')

    if (!habitData || habitData.length === 0) {
      if (prof && !prof.wa_verified) { router.push('/onboarding'); return }
      setProfile(prof)
      setHabits([])
      setLoading(false)
      return
    }

    const tz = prof?.timezone || 'Asia/Jakarta'
    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })
    const newStreaks: Record<string, HabitStreak> = {}
    const newCheckins = new Set<string>()

    for (const habit of habitData) {
      const { data: checkins } = await supabase
        .from('checkins')
        .select('checkin_date, status')
        .eq('habit_id', habit.id)
        .eq('user_id', user.id)

      const daysOfWeek = habit.schedules?.[0]?.days_of_week || [1, 2, 3, 4, 5, 6, 7]
      const s = computeStreaks(
        (checkins || []) as Checkin[],
        daysOfWeek,
        tz,
        habit.created_at?.split('T')[0]
      )
      newStreaks[habit.id] = s

      if (checkins?.some((c) => c.checkin_date === today)) {
        newCheckins.add(habit.id)
      }
    }

    setProfile(prof)
    setHabits(habitData)
    setHabitStreaks(newStreaks)
    setTodayCheckins(newCheckins)
    setLoading(false)
  }

  useEffect(() => { reload() }, [])

  const tz = profile?.timezone || 'Asia/Jakarta'
  const todayDayNum = getTodayDayNum(tz)

  const scheduledHabits = habits.filter((h) =>
    h.schedules?.[0]?.days_of_week?.includes(todayDayNum)
  )
  const nonScheduledHabits = habits.filter((h) =>
    !h.schedules?.[0]?.days_of_week?.includes(todayDayNum)
  )

  const doneCount = scheduledHabits.filter((h) => todayCheckins.has(h.id)).length
  const totalScheduled = scheduledHabits.length

  function getStreak(habitId: string): number {
    const s = habitStreaks[habitId]
    // Current streak = number of consecutive check-ins in recent days
    return s?.current || 0
  }



  async function handleCheckin(habitId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date().toLocaleDateString('en-CA', { timeZone: tz })

    const isChecked = todayCheckins.has(habitId)

    if (isChecked) {
      await supabase
        .from('checkins')
        .delete()
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
        .eq('checkin_date', today)

      setTodayCheckins((prev) => {
        const next = new Set(prev)
        next.delete(habitId)
        return next
      })
      reload()
    } else {
      const { error } = await supabase.from('checkins').upsert(
        { habit_id: habitId, user_id: user.id, checkin_date: today, status: 'done', source: 'web' },
        { onConflict: 'habit_id, checkin_date' }
      )

      if (!error) {
        setTodayCheckins((prev) => new Set(prev).add(habitId))

        const { data: freshCheckins } = await supabase
          .from('checkins')
          .select('checkin_date, status')
          .eq('habit_id', habitId)
          .eq('user_id', user.id)

        const habit = habits.find((h) => h.id === habitId)
        if (habit) {
          const daysOfWeek = habit.schedules?.[0]?.days_of_week || [1, 2, 3, 4, 5, 6, 7]
          const result = computeStreaks(
            (freshCheckins || []) as Checkin[],
            daysOfWeek,
            tz,
            habit.created_at?.split('T')[0]
          )
          if ([7, 30, 100].includes(result.current)) {
            const heatmapData: boolean[] = []
            for (let i = 27; i >= 0; i--) {
              const d = new Date()
              d.setDate(d.getDate() - i)
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
              heatmapData.push(freshCheckins?.some((c) => c.checkin_date === key && c.status === 'done') || false)
            }
            setCelebrateHabit({
              habitId: habit.id,
              name: habit.name,
              color: habit.color || '#22c55e',
              streak: result.current,
              heatmapData,
            })
          }
        }

        reload()
      }
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = scheduledHabits.findIndex((h) => h.id === active.id)
    const newIndex = scheduledHabits.findIndex((h) => h.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(scheduledHabits, oldIndex, newIndex)
    const supabase = createClient()

    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('habits')
        .update({ sort_order: i })
        .eq('id', reordered[i].id)
    }

    reload()
  }

  async function toggleReminder() {
    if (!profile) return
    setTogglingReminder(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ opted_out: !profile.opted_out }).eq('id', user.id)
    setProfile({ ...profile, opted_out: !profile.opted_out })
    setTogglingReminder(false)
    setShowDisableReminder(false)
  }

  async function confirmDelete() {
    if (!deleteHabit) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', deleteHabit.id)
    setDeleting(false)
    setDeleteHabit(null)
    reload()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Memuat...</p>
      </div>
    )
  }

  return (
    <>
    <div className="mx-auto w-full max-w-full sm:max-w-2xl px-4 py-6 pb-24">
      <div className="mb-6">
        <p className="text-sm text-muted-foreground">
          {getGreeting(tz)} 👋
        </p>
        <h1 className="text-xl sm:text-2xl font-bold">
          {totalScheduled === doneCount && totalScheduled > 0
            ? 'Hari yang sempurna ✨'
            : 'Your daily ritual'}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(tz)}</p>
      </div>

      <div className="mb-6 flex items-center gap-4">
        <ProgressRing done={doneCount} total={totalScheduled} />
        <div>
          <p className="text-lg font-semibold">
            {doneCount} of {totalScheduled} done
          </p>
          <p className="text-sm text-muted-foreground">
            {totalScheduled === 0
              ? 'Tidak ada habit terjadwal hari ini'
              : doneCount === totalScheduled
                ? 'Semua selesai untuk hari ini!'
                : `${totalScheduled - doneCount} lagi hari ini`}
          </p>
        </div>
      </div>

      {profile && !profile.wa_verified && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-950">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Verifikasi WhatsApp
              </p>
              <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
                Hubungkan nomor WhatsApp untuk mendapatkan reminder habit otomatis setiap hari.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push('/dashboard/settings')}
              className="shrink-0 bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Verifikasi
            </Button>
          </div>
        </div>
      )}

      {profile?.wa_verified && profile?.opted_out && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-600 dark:bg-yellow-950">
          <div className="flex items-center gap-2">
            <BellOff className="h-4 w-4 text-yellow-800 dark:text-yellow-200" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Semua reminder sedang nonaktif
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={toggleReminder}
            disabled={togglingReminder}
            className="shrink-0 border-yellow-400 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-600 dark:text-yellow-200 dark:hover:bg-yellow-900"
          >
            {togglingReminder ? 'Memproses...' : 'Aktifkan lagi'}
          </Button>
        </div>
      )}

      {profile?.wa_verified && !profile?.opted_out && profile && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Reminder aktif</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDisableReminder(true)}
            className="shrink-0 text-muted-foreground"
          >
            Nonaktifkan
          </Button>
        </div>
      )}

      <div className="space-y-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={scheduledHabits.map((h) => h.id)} strategy={verticalListSortingStrategy}>
            {scheduledHabits.map((habit) => {
              const sched = habit.schedules?.[0]
              return (
                <HabitCard
                  key={habit.id}
                  id={habit.id}
                  name={habit.name}
                  description={habit.description}
                  color={habit.color || '#22c55e'}
                  streak={getStreak(habit.id)}
                  checked={todayCheckins.has(habit.id)}
                  scheduledToday={true}
                  sendTime={sched?.send_time ? formatTime(sched.send_time) : undefined}
                  daysLabel={sched?.days_of_week ? labelDays(sched.days_of_week) : undefined}
                  onCheck={() => handleCheckin(habit.id)}
                  onClick={() => setEditHabit(habit)}
                />
              )
            })}
          </SortableContext>
        </DndContext>

        {scheduledHabits.length === 0 && habits.length > 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Tidak ada habit yang terjadwal hari ini
            </p>
          </div>
        )}

        {habits.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-2 text-3xl">🌱</div>
            <p className="text-base font-medium">Belum ada habit</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat habit pertamamu dan mulai lacak kebiasaan baik!
            </p>
          </div>
        )}
      </div>

      {nonScheduledHabits.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowNonScheduled(!showNonScheduled)}
            className="flex w-full items-center gap-2 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {showNonScheduled ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Tidak terjadwal hari ini ({nonScheduledHabits.length})
          </button>

          {showNonScheduled && (
            <div className="mt-2 space-y-3">
              {nonScheduledHabits.map((habit) => {
                const sched = habit.schedules?.[0]
                return (
                  <HabitCard
                    key={habit.id}
                    id={habit.id}
                    name={habit.name}
                    description={habit.description}
                    color={habit.color || '#22c55e'}
                    streak={getStreak(habit.id)}
                    checked={todayCheckins.has(habit.id)}
                    scheduledToday={false}
                    sendTime={sched?.send_time ? formatTime(sched.send_time) : undefined}
                    daysLabel={sched?.days_of_week ? labelDays(sched.days_of_week) : undefined}
                    onCheck={() => handleCheckin(habit.id)}
                    onClick={() => setEditHabit(habit)}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      <HabitSheet
        open={!!editHabit}
        onOpenChange={(o) => !o && setEditHabit(null)}
        onSuccess={reload}
        habit={editHabit ?? undefined}
      />

      <HabitSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onSuccess={reload}
      />

      <AlertDialog open={!!deleteHabit} onOpenChange={(o) => !o && setDeleteHabit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Habit</AlertDialogTitle>
            <AlertDialogDescription>
              Semua riwayat check-in habit ini ikut terhapus. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Menghapus...' : 'Ya, Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDisableReminder} onOpenChange={setShowDisableReminder}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan Semua Reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              Kamu tidak akan menerima pengingat WhatsApp untuk habit apapun sampai diaktifkan kembali.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={toggleReminder} disabled={togglingReminder}>
              {togglingReminder ? 'Memproses...' : 'Ya, Nonaktifkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav onAddClick={() => setShowCreateSheet(true)} />
      </div>

      <StreakShareDialog
        key={celebrateHabit?.habitId || 'none'}
        open={!!celebrateHabit}
        onOpenChange={(o) => !o && setCelebrateHabit(null)}
        habitName={celebrateHabit?.name || ''}
        streak={celebrateHabit?.streak || 0}
        color={celebrateHabit?.color || '#22c55e'}
        heatmapData={celebrateHabit?.heatmapData || []}
        userName={userName}
        title={`🎉 ${celebrateHabit?.streak || 0} hari berturut-turut!`}
      />
    </>
  )
}
