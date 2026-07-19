import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET() {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const svc = createServiceRoleClient()
  const { data } = await svc
    .from('template_packs')
    .select('*, items:template_items(id)')
    .order('sort_order')

  return NextResponse.json(data || [])
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const body = await request.json()
  const svc = createServiceRoleClient()

  const { data, error } = await svc
    .from('template_packs')
    .insert({
      slug: body.slug,
      title: body.title,
      description: body.description || null,
      category: body.category,
      emoji: body.emoji || '✨',
      is_premium: body.is_premium ?? true,
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
