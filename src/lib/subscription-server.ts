import 'server-only'
import { createClient } from '@/lib/supabase/server'

export async function isProServer(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('plan', 'pro')
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .maybeSingle()

  return !error && !!data
}
