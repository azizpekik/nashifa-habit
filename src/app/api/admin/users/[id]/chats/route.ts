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

  const { data: messages, error } = await svc
    .from('conversations')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ messages: [] })
  }

  return NextResponse.json(messages || [])
}
