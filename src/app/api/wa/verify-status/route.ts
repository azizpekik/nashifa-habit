import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRole = createServiceRoleClient()
  const { data: profile, error } = await serviceRole
    .from('profiles')
    .select('wa_verified, wa_number')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    return NextResponse.json({ error: 'Gagal mengambil status verifikasi' }, { status: 500 })
  }

  return NextResponse.json({
    verified: profile.wa_verified,
    wa_number: profile.wa_number,
  })
}
