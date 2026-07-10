import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const { wa_number, otp } = await request.json()

  let normalized = wa_number.trim()
  if (normalized.startsWith('+')) normalized = normalized.slice(1)
  if (normalized.startsWith('08')) normalized = '628' + normalized.slice(2)

  const serviceRole = createServiceRoleClient()

  const { data: profile, error: profileError } = await serviceRole
    .from('profiles')
    .select('id, wa_otp, wa_otp_expires_at')
    .eq('wa_number', normalized)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { ok: false, error: 'invalid' },
      { status: 400 }
    )
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

  const resetToken = crypto.randomBytes(32).toString('hex')
  const resetExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: updateError } = await serviceRole
    .from('profiles')
    .update({
      wa_otp: resetToken,
      wa_otp_expires_at: resetExpiresAt,
    })
    .eq('id', profile.id)

  if (updateError) {
    return NextResponse.json({ error: 'Gagal verifikasi OTP' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, reset_token: resetToken })
}
