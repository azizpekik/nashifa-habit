import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { itemId } = await params
  const body = await request.json()
  const svc = createServiceRoleClient()

  const { data, error } = await svc
    .from('template_items')
    .update({
      name: body.name,
      description: body.description,
      default_send_time: body.default_send_time,
      default_days: body.default_days,
      sort_order: body.sort_order,
    })
    .eq('id', itemId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { itemId } = await params
  const svc = createServiceRoleClient()
  const { error } = await svc.from('template_items').delete().eq('id', itemId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}
