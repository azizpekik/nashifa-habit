import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = 20
  const offset = (page - 1) * limit

  const svc = createServiceRoleClient()

  let query = svc
    .from('profiles')
    .select('*', { count: 'exact' })

  if (q) {
    query = query.or(`wa_number.ilike.%${q}%`)
  }

  const { data: profiles, count, error } = await query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const userIds = (profiles || []).map((p) => p.id)

  const { data: subscriptions } = await svc
    .from('subscriptions')
    .select('user_id, plan, status, current_period_end')
    .in('user_id', userIds)

  const subMap = new Map((subscriptions || []).map((s) => [s.user_id, s]))

  const { data: habitCounts } = await svc
    .from('habits')
    .select('user_id')
    .in('user_id', userIds)

  const countMap = new Map<string, number>()
  for (const h of habitCounts || []) {
    countMap.set(h.user_id, (countMap.get(h.user_id) || 0) + 1)
  }

  const totalPages = Math.ceil((userIds.length / 50) || 1)
  const emailMap = new Map<string, string | undefined>()
  for (let p = 1; p <= totalPages; p++) {
    const { data: authUsers } = await svc.auth.admin.listUsers({ page: p, perPage: 50 })
    for (const u of authUsers?.users || []) {
      emailMap.set(u.id, u.email)
    }
  }

  const result = (profiles || []).map((p) => ({
    ...p,
    email: emailMap.get(p.id) || null,
    subscription: subMap.get(p.id) || null,
    habit_count: countMap.get(p.id) || 0,
  }))

  return NextResponse.json({ users: result, total: count || 0, page, limit })
}
