import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  const { wa_number } = await request.json()

  let normalized = wa_number.trim()
  if (normalized.startsWith('+')) normalized = normalized.slice(1)
  if (normalized.startsWith('08')) normalized = '628' + normalized.slice(2)

  if (!/^628[0-9]{8,12}$/.test(normalized)) {
    return NextResponse.json(
      { error: 'Nomor WA tidak valid' },
      { status: 400 }
    )
  }

  const serviceRole = createServiceRoleClient()

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, wa_otp, wa_otp_expires_at')
    .eq('wa_number', normalized)
    .single()

  if (!profile) {
    return NextResponse.json({ ok: true })
  }

  if (profile.wa_otp_expires_at) {
    const expiresAt = new Date(profile.wa_otp_expires_at).getTime()
    if (expiresAt > Date.now()) {
      return NextResponse.json(
        { error: 'OTP sudah dikirim. Coba lagi dalam beberapa menit.' },
        { status: 429 }
      )
    }
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

  const { error: updateError } = await serviceRole
    .from('profiles')
    .update({
      wa_otp: otp,
      wa_otp_expires_at: expiresAt,
    })
    .eq('id', profile.id)

  if (updateError) {
    return NextResponse.json({ error: 'Gagal simpan OTP' }, { status: 500 })
  }

  const formData = new FormData()
  formData.append('target', normalized)
  formData.append(
    'message',
    `Kode OTP kamu: ${otp}. Berlaku 5 menit. Jangan bagikan ke siapa pun.`
  )

  const fonnteRes = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: process.env.FONNTE_TOKEN!,
    },
    body: formData,
  })

  if (!fonnteRes.ok) {
    return NextResponse.json(
      { error: 'Gagal kirim OTP via WhatsApp' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
