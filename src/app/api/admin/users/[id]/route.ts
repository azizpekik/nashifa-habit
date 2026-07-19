import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const { id } = await params
  const body = await request.json()
  const svc = createServiceRoleClient()

  if (body.plan) {
    const { data: existing } = await svc
      .from('subscriptions')
      .select('id')
      .eq('user_id', id)
      .maybeSingle()

    if (existing) {
      await svc
        .from('subscriptions')
        .update({
          plan: body.plan,
          status: body.status || 'active',
          current_period_end: body.current_period_end
            ? new Date(body.current_period_end).toISOString()
            : undefined,
        })
        .eq('user_id', id)
    } else {
      const days = body.extend_days || 30
      const periodEnd = new Date()
      periodEnd.setDate(periodEnd.getDate() + days)

      await svc
        .from('subscriptions')
        .insert({
          user_id: id,
          plan: body.plan || 'pro',
          status: 'active',
          provider: 'manual',
          current_period_end: body.current_period_end
            ? new Date(body.current_period_end).toISOString()
            : periodEnd.toISOString(),
        })
    }
  }

  if (body.opt_out !== undefined) {
    await svc.from('profiles').update({ opted_out: body.opt_out }).eq('id', id)
  }

  if (body.deactivate) {
    await svc.from('habits').update({ is_active: false }).eq('user_id', id)
  }

  if (body.extend_days && !body.plan) {
    const { data: sub } = await svc
      .from('subscriptions')
      .select('current_period_end')
      .eq('user_id', id)
      .maybeSingle()

    const currentEnd = sub?.current_period_end
      ? new Date(sub.current_period_end)
      : new Date()

    currentEnd.setDate(currentEnd.getDate() + body.extend_days)

    if (sub) {
      await svc
        .from('subscriptions')
        .update({ current_period_end: currentEnd.toISOString() })
        .eq('user_id', id)
    } else {
      await svc
        .from('subscriptions')
        .insert({
          user_id: id,
          plan: 'pro',
          status: 'active',
          provider: 'manual',
          current_period_end: currentEnd.toISOString(),
        })
    }
  }

  return NextResponse.json({ success: true })
}
