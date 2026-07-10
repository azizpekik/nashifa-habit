import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { otp } = await request.json()

  const serviceRole = createServiceRoleClient()

  const { data: profile, error: profileError } = await serviceRole
    .from('profiles')
    .select('wa_otp, wa_otp_expires_at')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: 'Gagal ambil profil' }, { status: 500 })
  }

  if (!profile.wa_otp || !profile.wa_otp_expires_at) {
    return NextResponse.json(
      { ok: false, error: 'expired' },
      { status: 400 }
    )
  }

  const now = Date.now()
  const expiresAt = new Date(profile.wa_otp_expires_at).getTime()

  if (now > expiresAt) {
    return NextResponse.json(
      { ok: false, error: 'expired' },
      { status: 400 }
    )
  }

  if (otp !== profile.wa_otp) {
    return NextResponse.json(
      { ok: false, error: 'invalid' },
      { status: 400 }
    )
  }

  const { error: updateError } = await serviceRole
    .from('profiles')
    .update({
      wa_verified: true,
      wa_otp: null,
      wa_otp_expires_at: null,
    })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Gagal verifikasi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
