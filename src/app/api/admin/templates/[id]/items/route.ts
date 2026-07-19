import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const svc = createServiceRoleClient()
  const { data } = await svc
    .from('template_items')
    .select('*')
    .eq('pack_id', id)
    .order('sort_order')

  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await request.json()
  const svc = createServiceRoleClient()

  const { data, error } = await svc
    .from('template_items')
    .insert({
      pack_id: id,
      name: body.name,
      description: body.description || null,
      default_send_time: body.default_send_time || '06:00',
      default_days: body.default_days || [1, 2, 3, 4, 5, 6, 7],
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
