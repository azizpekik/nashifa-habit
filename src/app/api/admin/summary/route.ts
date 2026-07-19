import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const svc = createServiceRoleClient()

  const { count: total_users } = await svc
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { count: active_7d } = await svc
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', sevenDaysAgo.toISOString())

  const { count: total_pro } = await svc
    .from('subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('plan', 'pro')
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())

  const today = new Date().toISOString().split('T')[0]
  const { count: checkins_today } = await svc
    .from('checkins')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today + 'T00:00:00')
    .lt('created_at', today + 'T23:59:59')

  return NextResponse.json({
    total_users: total_users || 0,
    active_7d: active_7d || 0,
    total_pro: total_pro || 0,
    checkins_today: checkins_today || 0,
  })
}
