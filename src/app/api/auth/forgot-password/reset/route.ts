import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  const { wa_number, reset_token, password } = await request.json()

  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: 'Password minimal 6 karakter' },
      { status: 400 }
    )
  }

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
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
  }

  if (!profile.wa_otp || !profile.wa_otp_expires_at) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
  }

  if (reset_token !== profile.wa_otp) {
    return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 })
  }

  const now = Date.now()
  const expiresAt = new Date(profile.wa_otp_expires_at).getTime()

  if (now > expiresAt) {
    return NextResponse.json({ error: 'Token sudah kedaluwarsa' }, { status: 400 })
  }

  const { error: updateError } = await serviceRole.auth.admin.updateUserById(
    profile.id,
    { password }
  )

  if (updateError) {
    return NextResponse.json(
      { error: 'Gagal mengubah password. Coba lagi.' },
      { status: 500 }
    )
  }

  await serviceRole
    .from('profiles')
    .update({
      wa_otp: null,
      wa_otp_expires_at: null,
    })
    .eq('id', profile.id)

  return NextResponse.json({ ok: true })
}
