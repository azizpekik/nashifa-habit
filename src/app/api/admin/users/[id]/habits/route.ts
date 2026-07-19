import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const svc = createServiceRoleClient()

  const { data: habits, error } = await svc
    .from('habits')
    .select('id, name, description, color, frequency, target_per_week, is_active, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const habitIds = habits.map((h) => h.id)

  const { data: schedules } = await svc
    .from('schedules')
    .select('habit_id, send_time, days_of_week')
    .in('habit_id', habitIds)

  const schedMap = new Map(schedules?.map((s) => [s.habit_id, s]))

  const { data: checkins } = await svc
    .from('checkins')
    .select('habit_id, checkin_date, status')
    .in('habit_id', habitIds)
    .order('checkin_date', { ascending: false })

  const checkinMap = new Map<string, { total: number; done: number; latest: string | null }>()
  for (const c of checkins || []) {
    if (!checkinMap.has(c.habit_id)) {
      checkinMap.set(c.habit_id, { total: 0, done: 0, latest: null })
    }
    const entry = checkinMap.get(c.habit_id)!
    entry.total++
    if (c.status === 'done') entry.done++
    if (!entry.latest) entry.latest = c.checkin_date
  }

  const result = habits.map((h) => ({
    ...h,
    schedule: schedMap.get(h.id) || null,
    checkins: checkinMap.get(h.id) || { total: 0, done: 0, latest: null },
  }))

  return NextResponse.json(result)
}
