import { createClient } from '@/lib/supabase/client'

export type TemplatePack = {
  id: string
  slug: string
  title: string
  description: string | null
  category: string
  emoji: string
  is_premium: boolean
  is_published: boolean
  sort_order: number
  created_at: string
  updated_at: string
  items?: TemplateItem[]
  item_count?: number
}

export type TemplateItem = {
  id: string
  pack_id: string
  name: string
  description: string | null
  default_send_time: string
  default_days: number[]
  sort_order: number
}

export async function getPublishedPacks(): Promise<TemplatePack[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('template_packs')
    .select('*, items:template_items(id)')
    .eq('is_published', true)
    .order('sort_order')

  if (!data) return []
  return data.map((pack) => ({
    ...pack,
    item_count: pack.items?.length || 0,
    items: undefined,
  }))
}

export async function getPackBySlug(slug: string): Promise<TemplatePack | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('template_packs')
    .select('*, items:template_items(*)')
    .eq('slug', slug)
    .single()

  if (!data) return null
  return {
    ...data,
    items: (data.items || []).sort((a: TemplateItem, b: TemplateItem) => a.sort_order - b.sort_order),
  }
}

export async function getUserTemplateItemIds(): Promise<Set<string>> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()

  const { data } = await supabase
    .from('habits')
    .select('template_item_id')
    .eq('user_id', user.id)
    .not('template_item_id', 'is', null)

  return new Set((data || []).map((h) => h.template_item_id))
}
